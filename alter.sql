/****** Object:  StoredProcedure [dbo].[DealReport]    Script Date: 13-04-2026 15:11:27 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[DealReport]
    @LocationIds       VARCHAR(MAX),  -- optional: comma-separated location IDs e.g. '9973,6106'
    @FromDate          DATETIME,  -- optional: defaults to beginning of time
    @ToDate            DATETIME,  -- optional: defaults to end of time
    @TransactionNumber VARCHAR(20)   -- optional: matches first 6 chars of TransactionNumber
AS
BEGIN
    SET NOCOUNT ON;

    -- Test values (uncomment to debug):
    --DECLARE @LocationIds      VARCHAR(MAX) = '9973,6106'
    --DECLARE @FromDate         DATETIME     = '03/30/2026 12:00am'
    --DECLARE @ToDate           DATETIME     = '04/30/2026 11:59pm'
    --DECLARE @TransactionNumber VARCHAR(20) = NULL

    DECLARE @StartDateKey INT, @EndDateKey INT

    -- Apply defaults for date range
    IF @FromDate IS NULL
        SET @FromDate = '1/1/1970 1:00am'
    IF @ToDate IS NULL
        SET @ToDate = '1/1/2100 1:00am'

    -- Normalise empty strings to NULL so IS NULL guards work uniformly
    IF @LocationIds = ''
        SET @LocationIds = NULL
    IF @TransactionNumber = ''
        SET @TransactionNumber = NULL

    -- Strip any spaces from the CSV (e.g. '9973, 6106' -> '9973,6106')
    IF @LocationIds IS NOT NULL
        SET @LocationIds = REPLACE(@LocationIds, ' ', '')

    -- FORMAT() is unsupported in Synapse dedicated pool; use CONVERT style 112 (yyyyMMdd)
    SET @StartDateKey = CAST(CONVERT(VARCHAR(8), @FromDate, 112) AS INT)
    SET @EndDateKey   = CAST(CONVERT(VARCHAR(8), @ToDate,   112) AS INT)

    SELECT
        SUBSTRING(st.TransactionNumber, 7,  5)  AS LocationId,
        SUBSTRING(st.TransactionNumber, 12, 3)  AS RegisterNumber,
        SUBSTRING(st.TransactionNumber, 1,  6)  AS TransactionNumber,
        SUBSTRING(st.TransactionNumber, 15, 8)  AS BusinessDate,
        sli.ItemCode,
        CAST(CONVERT(DECIMAL(16,2), sli.ItemRetailPrice) AS VARCHAR(20)) AS [SALE AMOUNT],
        sli.DiscountAmount,
        CASE
            WHEN DealDescription LIKE 'EMPLOYEE%' THEN 'Employee Discount'
            WHEN DealType = 1                     THEN 'PromoCoupon'
            WHEN DealType = 2                     THEN 'SmartCoupon'
            WHEN DealType = 3                     THEN 'Promo'
            WHEN DealType = 4                     THEN 'LoyaltyCertificate'
            ELSE                                       'No Deal'
        END AS DealType,
        Quantity,
        CASE WHEN DealDescription NOT LIKE 'EMPLOYEE%' AND DealType = 1 THEN ReferenceIdentifier ELSE '' END AS Coupon,
        CASE WHEN DealDescription NOT LIKE 'EMPLOYEE%' AND DealType = 2 THEN ReferenceIdentifier ELSE '' END AS SmartCoupon,
        CASE WHEN ManualDiscountReasonCode IS NULL THEN 0 ELSE 1 END AS IsManualDiscount,
        ManualDiscountAmount,
        ManualDiscountPercentage,
        ReferenceIdentifier,
        DealDescription                      AS DealName,
        SUBSTRING(ExternalDealId, 1, 5)      AS EventNumber,
        SUBSTRING(ExternalDealId, 7, 5)      AS DealNumber
    FROM
        [Tran].[SaleTransaction]  st
        INNER JOIN [Tran].[SaleLineItem]   sli ON sli.TransactionNumber = st.TransactionNumber
        LEFT  JOIN IT.[DimSaleModeType]    sm  ON sm.Id  = st.SaleModeTypeId
        LEFT  JOIN IT.[DimProcessSubType]  pst ON pst.Id = st.ProcessSubTypeId
    WHERE
        st.DateKey         BETWEEN @StartDateKey AND @EndDateKey
        AND st.TransactionTime BETWEEN @FromDate     AND @ToDate
        -- CSV location filter: STRING_SPLIT unsupported in Synapse dedicated pool.
        -- CHARINDEX searches for ',<locId>,' inside the padded CSV string.
        -- TRY_CAST guards against non-numeric LocationId values (NULL → row excluded).
        AND (
            @LocationIds IS NULL
            OR CHARINDEX(
                ',' + CAST(TRY_CAST(st.LocationId AS BIGINT) AS VARCHAR(20)) + ',',
                ',' + @LocationIds + ','
            ) > 0
        )
        AND (
            @TransactionNumber IS NULL
            OR SUBSTRING(st.TransactionNumber, 1, 6) = @TransactionNumber
        )
        AND sli.Voided        = 0
        AND st.ProcessStateId = 8
        AND st.SaleModeTypeId != 2
        AND Quantity          > 0
        AND sli.ItemRetailPrice > 0

END
GO


/*

    exec [Tran].GetTransaction '0012220997300103302026'

    exec [Tran].DeleteTransaction '0012220997300103302026'

    select * from [Tran].SaleTransaction
    select * from [Tran].SaleLineItem --where ItemCode like '%297%'
    select * from [Tran].SalePayment

    delete from [Tran].SaleTransaction
    delete from [Tran].SaleLineItem
    delete from [Tran].SalePayment
*/
