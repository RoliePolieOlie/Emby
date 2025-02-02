﻿(function ($, document) {

    var pageSizeKey = 'people';

    // The base query options
    var query = {

        SortBy: "SortName",
        SortOrder: "Ascending",
        IncludeItemTypes: "Series,Episode",
        Recursive: true,
        Fields: "DateCreated,ItemCounts",
        PersonTypes: "",
        StartIndex: 0,
        Limit: 100
    };

    function getSavedQueryKey() {

        return 'tvpeople' + (query.ParentId || '');
    }

    function reloadItems(page) {

        Dashboard.showLoadingMsg();

        ApiClient.getPeople(Dashboard.getCurrentUserId(), query).done(function (result) {

            // Scroll back up so they can see the results from the beginning
            window.scrollTo(0, 0);

            var html = '';
            var pagingHtml = LibraryBrowser.getQueryPagingHtml({
                startIndex: query.StartIndex,
                limit: query.Limit,
                totalRecordCount: result.TotalRecordCount,
                viewButton: true,
                showLimit: false
            });

            page.querySelector('.listTopPaging').innerHTML = pagingHtml;

            updateFilterControls(page);

            html = LibraryBrowser.getPosterViewHtml({
                items: result.Items,
                shape: "portrait",
                context: 'tv',
                showTitle: true,
                showItemCounts: true,
                coverImage: true,
                lazy: true
            });

            var elem = page.querySelector('#items');
            elem.innerHTML = html + pagingHtml;
            ImageLoader.lazyChildren(elem);

            $('.btnNextPage', page).on('click', function () {
                query.StartIndex += query.Limit;
                reloadItems(page);
            });

            $('.btnPreviousPage', page).on('click', function () {
                query.StartIndex -= query.Limit;
                reloadItems(page);
            });

            LibraryBrowser.saveQueryValues(getSavedQueryKey(), query);

            Dashboard.hideLoadingMsg();
        });
    }

    function updateFilterControls(page) {

        $('.chkStandardFilter', page).each(function () {

            var filters = "," + (query.Filters || "");
            var filterName = this.getAttribute('data-filter');

            this.checked = filters.indexOf(',' + filterName) != -1;

        }).checkboxradio('refresh');

        $('.chkPersonTypeFilter', page).each(function () {

            var filters = "," + (query.PersonTypes || "");
            var filterName = this.getAttribute('data-filter');

            this.checked = filters.indexOf(',' + filterName) != -1;

        }).checkboxradio('refresh');

        $('.alphabetPicker', page).alphaValue(query.NameStartsWithOrGreater);
    }

    $(document).on('pageinitdepends', "#tvPeoplePage", function () {

        var page = this;

        $('.chkStandardFilter', this).on('change', function () {

            var filterName = this.getAttribute('data-filter');
            var filters = query.Filters || "";

            filters = (',' + filters).replace(',' + filterName, '').substring(1);

            if (this.checked) {
                filters = filters ? (filters + ',' + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.Filters = filters;

            reloadItems(page);
        });

        $('.chkPersonTypeFilter', this).on('change', function () {

            var filterName = this.getAttribute('data-filter');
            var filters = query.PersonTypes || "";

            filters = (',' + filters).replace(',' + filterName, '').substring(1);

            if (this.checked) {
                filters = filters ? (filters + ',' + filterName) : filterName;
            }

            query.StartIndex = 0;
            query.PersonTypes = filters;

            reloadItems(page);
        });

        $('.alphabetPicker', this).on('alphaselect', function (e, character) {

            query.NameStartsWithOrGreater = character;
            query.StartIndex = 0;

            reloadItems(page);

        }).on('alphaclear', function (e) {

            query.NameStartsWithOrGreater = '';

            reloadItems(page);
        });

    }).on('pagebeforeshowready', "#tvPeoplePage", function () {

        query.ParentId = LibraryMenu.getTopParentId();

        var limit = LibraryBrowser.getDefaultPageSize(pageSizeKey, 100);

        // If the default page size has changed, the start index will have to be reset
        if (limit != query.Limit) {
            query.Limit = limit;
            query.StartIndex = 0;
        }

        LibraryBrowser.loadSavedQueryValues(getSavedQueryKey(), query);
        query.SortBy = "SortName";

        reloadItems(this);

        updateFilterControls(this);
    });

})(jQuery, document);