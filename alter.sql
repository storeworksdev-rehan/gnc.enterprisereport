/****** Object:  StoredProcedure [Tran].[SalesReport]    Script Date: 13-04-2026 14:25:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- exec [Tran].[SalesReport] @LocationIds='11',@TransactionNumber='',@FromDate='',@ToDate=''
ALTER PROCEDURE [Tran].[SalesReport]
    @LocationIds       VARCHAR(MAX),
    @FromDate          VARCHAR(30),
    @ToDate            VARCHAR(30),
    @TransactionNumber VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Test values (uncomment to debug):
    --DECLARE @LocationIds      VARCHAR(MAX) = '9973,6106'
    --DECLARE @FromDate         VARCHAR(30)  = '03/30/2026 12:00am'
    --DECLARE @ToDate           VARCHAR(30)  = '04/30/2026 11:59pm'
    --DECLARE @TransactionNumber VARCHAR(20) = NULL

    DECLARE @StartDateKey INT, @EndDateKey INT
    DECLARE @FromDateDT DATETIME, @ToDateDT DATETIME
    DECLARE @FilterByLocation BIT = 0

    -- Normalise empty strings to NULL
    IF @LocationIds     = '' SET @LocationIds     = NULL
    IF @TransactionNumber = '' SET @TransactionNumber = NULL
    IF @FromDate        = '' SET @FromDate        = NULL
    IF @ToDate          = '' SET @ToDate          = NULL

    -- Strip spaces from CSV
    IF @LocationIds IS NOT NULL
        SET @LocationIds = REPLACE(@LocationIds, ' ', '')

    -- Apply date defaults
    SET @FromDateDT = ISNULL(TRY_CAST(@FromDate AS DATETIME), '1/1/1970 1:00am')
    SET @ToDateDT   = ISNULL(TRY_CAST(@ToDate   AS DATETIME), '1/1/2100 1:00am')

    -- CONVERT style 112 (yyyyMMdd) — FORMAT() unsupported in Synapse
    SET @StartDateKey = CAST(CONVERT(VARCHAR(8), @FromDateDT, 112) AS INT)
    SET @EndDateKey   = CAST(CONVERT(VARCHAR(8), @ToDateDT,   112) AS INT)

    -- Parse CSV into indexed temp table; JOIN is faster than correlated EXISTS
    CREATE TABLE #LocationList (LocationId INT NOT NULL)

    IF @LocationIds IS NOT NULL
    BEGIN
        SET @FilterByLocation = 1

        DECLARE @List VARCHAR(MAX) = @LocationIds
        DECLARE @Len  INT

        WHILE LEN(@List) > 0
        BEGIN
            SELECT @Len = CASE CHARINDEX(',', @List)
                              WHEN 0 THEN LEN(@List)
                              ELSE CHARINDEX(',', @List) - 1
                          END

            INSERT INTO #LocationList (LocationId)
            SELECT TRY_CAST(SUBSTRING(@List, 1, @Len) AS INT)
            WHERE  TRY_CAST(SUBSTRING(@List, 1, @Len) AS INT) IS NOT NULL  -- skip bad values

            SELECT @List = CASE LEN(@List) - @Len
                               WHEN 0 THEN ''
                               ELSE RIGHT(@List, LEN(@List) - @Len - 1)
                           END
        END

        -- Index after bulk insert — avoids per-row seeks without it
        CREATE CLUSTERED INDEX CIX_LocationList ON #LocationList (LocationId)
    END

    -- ── Line-item rows ──────────────────────────────────────────────────────
    SELECT
        SUBSTRING(st.TransactionNumber, 7,  5)  AS LocationId,
        SUBSTRING(st.TransactionNumber, 12, 3)  AS RegisterNumber,
        SUBSTRING(st.TransactionNumber, 1,  6)  AS TransactionNumber,
        SUBSTRING(st.TransactionNumber, 15, 8)  AS BusinessDate,
        CASE
            WHEN sm.Id IS NOT NULL                          THEN sm.Name
            WHEN sm.Id IS NULL AND st.ProcessSubTypeId = 0  THEN 'Sale'
            WHEN sm.Id IS NULL AND st.ProcessSubTypeId = 99 THEN 'StandardReturn'
        END AS TranType,
        sli.ItemCode,
        CAST(CONVERT(DECIMAL(16,2), sli.ExtendedSellingPrice)                         AS VARCHAR(20)) AS [SALE AMOUNT],
        CAST(CONVERT(DECIMAL(16,2), sli.Quantity)                                     AS VARCHAR(20)) AS [UNITS SOLD],
        CAST(CONVERT(DECIMAL(16,2), sli.ExtendedTaxAmount)                            AS VARCHAR(20)) AS [TAX],
        CAST(CONVERT(DECIMAL(16,2), sli.ExtendedSellingPrice + sli.ExtendedTaxAmount) AS VARCHAR(20)) AS [TOTAL PER LINE],
        '' AS [TENDER],
        '' AS [FINAL AMOUNT],
        '' AS [AUTH APPROVAL],
        '' AS [LAST FOUR]
    FROM
        [Tran].[SaleTransaction]  st
        INNER JOIN [Tran].[SaleLineItem]  sli ON sli.TransactionNumber = st.TransactionNumber
        LEFT  JOIN IT.[DimSaleModeType]   sm  ON sm.Id  = st.SaleModeTypeId
        LEFT  JOIN IT.[DimProcessSubType] pst ON pst.Id = st.ProcessSubTypeId
        -- JOIN replaces correlated EXISTS — evaluated once, not per outer row
        LEFT  JOIN #LocationList          ll  ON ll.LocationId = st.LocationId
    WHERE
        st.DateKey         BETWEEN @StartDateKey AND @EndDateKey
        AND st.TransactionTime BETWEEN @FromDateDT  AND @ToDateDT
        AND (@FilterByLocation = 0 OR ll.LocationId IS NOT NULL)
        AND (
            @TransactionNumber IS NULL
            -- LIKE is sargable on an indexed column; SUBSTRING() is not
            OR st.TransactionNumber LIKE @TransactionNumber + '%'
        )
        AND sli.Voided        = 0
        AND st.ProcessStateId = 8
        AND st.SaleModeTypeId != 2

    UNION ALL

    -- ── Payment / tender rows ───────────────────────────────────────────────
    SELECT
        SUBSTRING(st.TransactionNumber, 7,  5)  AS LocationId,
        SUBSTRING(st.TransactionNumber, 12, 3)  AS RegisterNumber,
        SUBSTRING(st.TransactionNumber, 1,  6)  AS TransactionNumber,
        SUBSTRING(st.TransactionNumber, 15, 8)  AS BusinessDate,
        CASE
            WHEN sm.Id IS NOT NULL                          THEN sm.Name
            WHEN sm.Id IS NULL AND st.ProcessSubTypeId = 0  THEN 'Sale'
            WHEN sm.Id IS NULL AND st.ProcessSubTypeId = 99 THEN 'StandardReturn'
        END AS TranType,
        '' AS [ITEM],
        '' AS [SALE AMOUNT],
        '' AS [UNITS SOLD],
        '' AS [TAX],
        '' AS [TOTAL PER LINE],
        dt.Name                                                     AS [TENDER],
        CAST(CONVERT(DECIMAL(16,2), sp.Amount) AS VARCHAR(20))      AS [FINAL AMOUNT],
        CAST(sp.AuthNumber                     AS VARCHAR(20))      AS [AUTH APPROVAL],
        sp.CardLastFour                                             AS [LAST FOUR]
    FROM
        [Tran].[SaleTransaction]  st
        INNER JOIN [Tran].[SalePayment]   sp  ON sp.TransactionNumber = st.TransactionNumber
        INNER JOIN [IT].[DimTender]       dt  ON sp.TenderTypeId      = dt.Id
        LEFT  JOIN IT.[DimSaleModeType]   sm  ON sm.Id  = st.SaleModeTypeId
        LEFT  JOIN IT.[DimProcessSubType] pst ON pst.Id = st.ProcessSubTypeId
        LEFT  JOIN #LocationList          ll  ON ll.LocationId = st.LocationId
    WHERE
        st.DateKey         BETWEEN @StartDateKey AND @EndDateKey
        AND st.TransactionTime BETWEEN @FromDateDT  AND @ToDateDT
        AND (@FilterByLocation = 0 OR ll.LocationId IS NOT NULL)
        AND (
            @TransactionNumber IS NULL
            OR st.TransactionNumber LIKE @TransactionNumber + '%'
        )
        AND st.ProcessStateId = 8
        AND st.SaleModeTypeId != 2

    ORDER BY SUBSTRING(st.TransactionNumber, 1, 6), TENDER ASC
    DROP TABLE #LocationList
END
GO


/****** Object:  StoredProcedure [dbo].[DealReport] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- exec [dbo].[DealReport] @LocationIds='11',@TransactionNumber='',@FromDate='',@ToDate=''
ALTER PROCEDURE [dbo].[DealReport]
    @LocationIds       VARCHAR(MAX),
    @FromDate          VARCHAR(30),
    @ToDate            VARCHAR(30),
    @TransactionNumber VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Test values (uncomment to debug):
    --DECLARE @LocationIds      VARCHAR(MAX) = '9973,6106'
    --DECLARE @FromDate         VARCHAR(30)  = '03/30/2026 12:00am'
    --DECLARE @ToDate           VARCHAR(30)  = '04/30/2026 11:59pm'
    --DECLARE @TransactionNumber VARCHAR(20) = NULL

    DECLARE @StartDateKey INT, @EndDateKey INT
    DECLARE @FromDateDT DATETIME, @ToDateDT DATETIME
    DECLARE @FilterByLocation BIT = 0

    -- Normalise empty strings to NULL
    IF @LocationIds     = '' SET @LocationIds     = NULL
    IF @TransactionNumber = '' SET @TransactionNumber = NULL
    IF @FromDate        = '' SET @FromDate        = NULL
    IF @ToDate          = '' SET @ToDate          = NULL

    -- Strip spaces from CSV
    IF @LocationIds IS NOT NULL
        SET @LocationIds = REPLACE(@LocationIds, ' ', '')

    -- Apply date defaults
    SET @FromDateDT = ISNULL(TRY_CAST(@FromDate AS DATETIME), '1/1/1970 1:00am')
    SET @ToDateDT   = ISNULL(TRY_CAST(@ToDate   AS DATETIME), '1/1/2100 1:00am')

    -- CONVERT style 112 (yyyyMMdd) — FORMAT() unsupported in Synapse
    SET @StartDateKey = CAST(CONVERT(VARCHAR(8), @FromDateDT, 112) AS INT)
    SET @EndDateKey   = CAST(CONVERT(VARCHAR(8), @ToDateDT,   112) AS INT)

    -- Parse CSV into indexed temp table
    CREATE TABLE #LocationList (LocationId INT NOT NULL)

    IF @LocationIds IS NOT NULL
    BEGIN
        SET @FilterByLocation = 1

        DECLARE @List VARCHAR(MAX) = @LocationIds
        DECLARE @Len  INT

        WHILE LEN(@List) > 0
        BEGIN
            SELECT @Len = CASE CHARINDEX(',', @List)
                              WHEN 0 THEN LEN(@List)
                              ELSE CHARINDEX(',', @List) - 1
                          END

            INSERT INTO #LocationList (LocationId)
            SELECT TRY_CAST(SUBSTRING(@List, 1, @Len) AS INT)
            WHERE  TRY_CAST(SUBSTRING(@List, 1, @Len) AS INT) IS NOT NULL

            SELECT @List = CASE LEN(@List) - @Len
                               WHEN 0 THEN ''
                               ELSE RIGHT(@List, LEN(@List) - @Len - 1)
                           END
        END

        CREATE CLUSTERED INDEX CIX_LocationList ON #LocationList (LocationId)
    END

    SELECT
        SUBSTRING(st.TransactionNumber, 7,  5)  AS LocationId,
        SUBSTRING(st.TransactionNumber, 12, 3)  AS RegisterNumber,
        SUBSTRING(st.TransactionNumber, 1,  6)  AS TransactionNumber,
        SUBSTRING(st.TransactionNumber, 15, 8)  AS BusinessDate,
        sli.ItemCode,
        CAST(CONVERT(DECIMAL(16,2), sli.ItemRetailPrice) AS VARCHAR(20)) AS [SALE AMOUNT],
        sli.DiscountAmount,
        CASE
            WHEN sli.DealDescription LIKE 'EMPLOYEE%' THEN 'Employee Discount'
            WHEN sli.DealType = 1                     THEN 'PromoCoupon'
            WHEN sli.DealType = 2                     THEN 'SmartCoupon'
            WHEN sli.DealType = 3                     THEN 'Promo'
            WHEN sli.DealType = 4                     THEN 'LoyaltyCertificate'
            ELSE                                           'No Deal'
        END AS DealType,
        sli.Quantity,
        CASE WHEN sli.DealDescription NOT LIKE 'EMPLOYEE%' AND sli.DealType = 1 THEN sli.ReferenceIdentifier ELSE '' END AS Coupon,
        CASE WHEN sli.DealDescription NOT LIKE 'EMPLOYEE%' AND sli.DealType = 2 THEN sli.ReferenceIdentifier ELSE '' END AS SmartCoupon,
        CASE WHEN sli.ManualDiscountReasonCode IS NULL THEN 0 ELSE 1 END AS IsManualDiscount,
        sli.ManualDiscountAmount,
        sli.ManualDiscountPercentage,
        sli.ReferenceIdentifier,
        sli.DealDescription                 AS DealName,
        SUBSTRING(sli.ExternalDealId, 1, 5) AS EventNumber,
        SUBSTRING(sli.ExternalDealId, 7, 5) AS DealNumber
    FROM
        [Tran].[SaleTransaction]  st
        INNER JOIN [Tran].[SaleLineItem]  sli ON sli.TransactionNumber = st.TransactionNumber
        LEFT  JOIN IT.[DimSaleModeType]   sm  ON sm.Id  = st.SaleModeTypeId
        LEFT  JOIN IT.[DimProcessSubType] pst ON pst.Id = st.ProcessSubTypeId
        LEFT  JOIN #LocationList          ll  ON ll.LocationId = st.LocationId
    WHERE
        st.DateKey         BETWEEN @StartDateKey AND @EndDateKey
        AND st.TransactionTime BETWEEN @FromDateDT  AND @ToDateDT
        AND (@FilterByLocation = 0 OR ll.LocationId IS NOT NULL)
        AND (
            @TransactionNumber IS NULL
            OR st.TransactionNumber LIKE @TransactionNumber + '%'
        )
        AND sli.Voided          = 0
        AND st.ProcessStateId   = 8
        AND st.SaleModeTypeId  != 2
        AND sli.Quantity        > 0
        AND sli.ItemRetailPrice > 0

    DROP TABLE #LocationList
END
GO
