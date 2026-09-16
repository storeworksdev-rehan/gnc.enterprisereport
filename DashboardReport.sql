/****** StoredProcedure [dbo].[DashboardReport_Dummy] ******
   Fully self-contained — no table, no seed data. Every value is generated
   on the fly with RAND(CHECKSUM(NEWID())) (reseeded per call so each column
   gets its own independent random draw, not SQL Server's usual "same RAND()
   value for the whole statement" behaviour), then combined with plain
   arithmetic so the numbers stay internally consistent (e.g. AvgSaleAmount
   is always TotalSaleAmount / TransactionCount, not a second unrelated
   random draw). @Debug = 1 skips the random draws and returns fixed values
   instead, for reproducible manual/automated testing.

   Parameter list mirrors the real procedure's signature exactly:
     ALTER PROCEDURE [Tran].DailyDashboard
         (@DateRangeType varchar(20), @LocationName varchar(8000), @Debug bit)
   so the frontend doesn't need to change when this dummy version is swapped
   for the real [Tran].[DailyDashboard] later. None of the three are used to
   actually filter data here (there's no backing table to filter) — they're
   accepted only to match the call signature:
     @DateRangeType — a named range key ('Today','ThisWeek','LastWeek',
       'ThisMonth','LastMonth','ThisYear'), or 'Custom:<from>:<to>' (ISO
       dates) for a custom range — see toDateRangeType() in
       app/dashboard/page.tsx. The real procedure's own convention for
       encoding a custom range isn't known yet; update both sides together
       once it's confirmed.
     @LocationName — CSV of selected location ids, or NULL/blank for all.
     @Debug — 1 returns fixed values instead of random ones.

   Column names, order, and result-set order were aligned to a reference
   capture from the real dataset (three result grids, shared alongside the
   [Tran].[DailyDashboard] stub this dummy version stands in for):

     1) Sale-side metrics : TotalSaleAmount, TransactionCount, AvgSaleAmount,
        AvgUnitsPerTransaction, MultiVitaminsSold, FishOilSold, TotalTaxCollected
        — exact column set/order from the reference capture.
        TotalUnitsSold, LastYearTotalSaleAmount, LastYearTransactionCount are
        appended after (not present in the reference — kept as-is from the
        prior version of this file, for the Total Units Sold breakdown and
        the Net Sales / Sale Transactions YoY cards on app/dashboard/page.tsx).
     2) Loyalty / subscriptions: NewSubscriptions, MyRewards, ProAccess
        — exact column set/order from the reference capture (note the
        renames: MyRewardsSignups -> MyRewards, ProAccessSignups -> ProAccess).
        CancelledSubscriptions is appended after (not present in the
        reference — kept as-is, feeds the New Subscriptions card's
        Cancelled breakdown row).
     3) Return-side totals: TotalSaleAmount, TransactionCount, NewSubscriptions
        — exact column set/order from the reference capture. NewSubscriptions
        here mirrors the same value as result set 2's column of the same
        name (a single draw, not a second independent one) since the
        reference capture carries it on both result sets; flag if that's
        not actually intentional on the real procedure.
*******************************************************************/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- exec [dbo].[DashboardReport_Dummy] @DateRangeType='Today', @LocationName='', @Debug=0
-- exec [dbo].[DashboardReport_Dummy] @DateRangeType='ThisMonth', @LocationName='01709,03683', @Debug=0
-- exec [dbo].[DashboardReport_Dummy] @DateRangeType='Today', @LocationName='', @Debug=1  -- fixed values
CREATE OR ALTER PROCEDURE [Tran].[DashboardReport_Dummy]
    @DateRangeType VARCHAR(20)   = NULL,
    @LocationName  VARCHAR(8000) = NULL,
    @Debug         BIT           = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalSaleAmount         DECIMAL(18,4)
    DECLARE @TransactionCount        INT
    DECLARE @AvgUnitsPerTransaction  DECIMAL(18,6)
    DECLARE @MultiVitaminsPct        DECIMAL(9,6)
    DECLARE @FishOilPct              DECIMAL(9,6)
    DECLARE @TaxPct                  DECIMAL(9,6)
    DECLARE @YoySalesVariance        DECIMAL(9,6)
    DECLARE @YoyTxnVariance          DECIMAL(9,6)
    DECLARE @ReturnPct               DECIMAL(9,6)
    DECLARE @ReturnTxnCount          INT
    DECLARE @MyRewardsSignups        INT
    DECLARE @ProAccessSignups        INT
    DECLARE @NewSubscriptions        INT
    DECLARE @CancelledSubscriptions  INT

    IF @Debug = 1
    BEGIN
        -- Fixed values — same shape/magnitude as a real-data capture, but
        -- constant across calls so a test can assert on an exact number.
        SET @TotalSaleAmount        = 114629.4470;
        SET @TransactionCount       = 1773;
        SET @AvgUnitsPerTransaction = 2.669274;
        SET @MultiVitaminsPct       = 0.126460;  -- -> MultiVitaminsSold  14,493.8619
        SET @FishOilPct             = 0.026615;  -- -> FishOilSold        3,051.3212
        SET @TaxPct                 = 0.104568;  -- -> TotalTaxCollected 11,986.9159
        SET @YoySalesVariance       = 0.006107;  -- -> LastYearTotalSaleAmount 113,933.5409
        SET @YoyTxnVariance         = 0.151299;  -- -> LastYearTransactionCount 1,540
        SET @ReturnPct              = 0.047368;  -- -> Return TotalSaleAmount (5,428.7360)
        SET @ReturnTxnCount         = 55;
        SET @MyRewardsSignups       = 14;
        SET @ProAccessSignups       = 2;
        SET @NewSubscriptions       = 3;
        SET @CancelledSubscriptions = 0;
    END
    ELSE
    BEGIN
        -- ── Sale-side random draws ───────────────────────────────────────
        SET @TotalSaleAmount        = CAST(50000  + (RAND(CHECKSUM(NEWID())) * 200000) AS DECIMAL(18,4));  -- $50k - $250k
        SET @TransactionCount       = CAST(500    + (RAND(CHECKSUM(NEWID())) * 2500)   AS INT);           -- 500 - 3,000
        SET @AvgUnitsPerTransaction = CAST(1.5    + (RAND(CHECKSUM(NEWID())) * 2.5)     AS DECIMAL(18,6));-- 1.5 - 4.0
        SET @MultiVitaminsPct       = CAST(0.05   + (RAND(CHECKSUM(NEWID())) * 0.10)    AS DECIMAL(9,6)); -- 5% - 15% of sales
        SET @FishOilPct             = CAST(0.02   + (RAND(CHECKSUM(NEWID())) * 0.06)    AS DECIMAL(9,6)); -- 2% - 8% of sales
        SET @TaxPct                 = CAST(0.08   + (RAND(CHECKSUM(NEWID())) * 0.04)    AS DECIMAL(9,6)); -- 8% - 12% of sales

        -- Year-over-year comparison (Net Sales / Sale Transactions cards'
        -- YoY track): LastYear = current / (1 + variance), variance in -20%..+30%.
        SET @YoySalesVariance = -0.20 + (RAND(CHECKSUM(NEWID())) * 0.50);
        SET @YoyTxnVariance   = -0.20 + (RAND(CHECKSUM(NEWID())) * 0.50);

        -- ── Return-side random draws ─────────────────────────────────────
        SET @ReturnPct      = CAST(0.02 + (RAND(CHECKSUM(NEWID())) * 0.06) AS DECIMAL(9,6)); -- 2% - 8% of sale $
        SET @ReturnTxnCount = CAST(20   + (RAND(CHECKSUM(NEWID())) * 130)  AS INT);          -- 20 - 150

        -- ── Loyalty / subscription random draws ──────────────────────────
        SET @MyRewardsSignups       = CAST(1 + (RAND(CHECKSUM(NEWID())) * 14) AS INT); -- 1 - 15
        SET @ProAccessSignups       = CAST(1 + (RAND(CHECKSUM(NEWID())) * 9)  AS INT); -- 1 - 10
        SET @NewSubscriptions       = CAST(1 + (RAND(CHECKSUM(NEWID())) * 11) AS INT); -- 1 - 12
        SET @CancelledSubscriptions = CAST(RAND(CHECKSUM(NEWID())) * (@NewSubscriptions * 0.3) AS INT); -- 0 - 30% of new
    END

    -- ── Result set 1: Sale-side dashboard metrics ───────────────────────────
    SELECT
        @TotalSaleAmount                                                                    AS TotalSaleAmount,
        @TransactionCount                                                                   AS TransactionCount,
        CONVERT(DECIMAL(18,6), @TotalSaleAmount / NULLIF(@TransactionCount, 0))              AS AvgSaleAmount,
        @AvgUnitsPerTransaction                                                              AS AvgUnitsPerTransaction,
        CONVERT(DECIMAL(18,4), @TotalSaleAmount * @MultiVitaminsPct)                         AS MultiVitaminsSold,
        CONVERT(DECIMAL(18,4), @TotalSaleAmount * @FishOilPct)                               AS FishOilSold,
        CONVERT(DECIMAL(18,4), @TotalSaleAmount * @TaxPct)                                   AS TotalTaxCollected,
        CAST(ROUND(@AvgUnitsPerTransaction * @TransactionCount, 0) AS INT)                   AS TotalUnitsSold,
        CONVERT(DECIMAL(18,4), @TotalSaleAmount / NULLIF(1 + @YoySalesVariance, 0))          AS LastYearTotalSaleAmount,
        CAST(ROUND(@TransactionCount / NULLIF(1 + @YoyTxnVariance, 0), 0) AS INT)            AS LastYearTransactionCount

    -- ── Result set 2: Loyalty / subscription dashboard metrics ─────────────
    SELECT
        @NewSubscriptions                                                                    AS NewSubscriptions,
        @MyRewardsSignups                                                                    AS MyRewards,
        @ProAccessSignups                                                                    AS ProAccess,
        @CancelledSubscriptions                                                              AS CancelledSubscriptions

    -- ── Result set 3: Return-side dashboard metrics ─────────────────────────
    SELECT
        CONVERT(DECIMAL(18,4), -1 * @TotalSaleAmount * @ReturnPct)                           AS TotalSaleAmount,
        @ReturnTxnCount                                                                      AS TransactionCount,
        @NewSubscriptions                                                                    AS NewSubscriptions
END
GO
