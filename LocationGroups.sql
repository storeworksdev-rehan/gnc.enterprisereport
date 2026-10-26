/****** StoredProcedure [Tran].[LocationGroups] ******
   Fully self-contained dummy lookup procedure — no backing table. Generates
   its rows from a numbers CTE (sys.all_objects as the row source) rather
   than ~150 literal INSERT statements.

   Returns two result sets that are INDEPENDENT of each other — there is no
   relationship between a GroupName and a LocationId; they're two separate
   flat lookup lists, not a hierarchy:

     1) Location groups (~100 rows): GroupName, GroupLevel, SortOrder
        GroupLevel cycles 1-4 (Division / District / Region / Territory);
        SortOrder is the row's natural order within the whole set.
     2) Location ids (~50 rows): LocationId (int)

   Endpoint this will be served behind is TBD (to be provided) — the
   frontend's getLocationGroups() call in app/dashboard/page.tsx is a
   placeholder guess (`/api/Tran/getLocationGroups`, matching the naming
   convention of getDashboardReportDummy) and will need updating once the
   real route is confirmed.
*******************************************************************/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- exec [Tran].[LocationGroups]
CREATE OR ALTER PROCEDURE [Tran].[LocationGroups]
AS
BEGIN
    SET NOCOUNT ON;

    -- ── Result set 1: ~100 dummy location groups ────────────────────────
    ;WITH Numbers AS (
        SELECT TOP (100) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    SELECT
        CASE (n - 1) % 4
            WHEN 0 THEN 'Division '
            WHEN 1 THEN 'District '
            WHEN 2 THEN 'Region '
            ELSE        'Territory '
        END + CAST((n - 1) / 4 + 1 AS VARCHAR(10))                AS GroupName,
        (n - 1) % 4 + 1                                           AS GroupLevel,
        n                                                         AS SortOrder
    FROM Numbers
    ORDER BY n;

    -- ── Result set 2: ~50 dummy location ids (unrelated to the groups
    --    above — plain flat list, no GroupName/LocationId relation) ──────
    ;WITH Numbers2 AS (
        SELECT TOP (50) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    SELECT 1000 + n AS LocationId
    FROM Numbers2
    ORDER BY LocationId;
END
GO
