﻿(function ($, window, document) {

    var currentItem;

    function showLocalSubtitles(page, index) {

        Dashboard.showLoadingMsg();

        var popup = $('.popupSubtitleViewer', page).popup('open');
        $('.subtitleContent', page).html('');

        var url = 'Videos/' + currentItem.Id + '/Subtitles/' + index;

        $.get(ApiClient.getUrl(url)).done(function (result) {

            $('.subtitleContent', page).html(result);

            Dashboard.hideLoadingMsg();

            popup.popup('reposition', {});
        });
    }

    function showRemoteSubtitles(page, id) {

        Dashboard.showLoadingMsg();

        var popup = $('.popupSubtitleViewer', page).popup('open');
        $('.subtitleContent', page).html('\nLoading...\n\n\n');

        var url = 'Providers/Subtitles/Subtitles/' + id;

        ApiClient.get(ApiClient.getUrl(url)).done(function (result) {

            $('.subtitleContent', page).html(result);

            Dashboard.hideLoadingMsg();

            popup.popup('reposition', {});
        });
    }

    function downloadRemoteSubtitles(page, id) {

        var url = 'Items/' + currentItem.Id + '/RemoteSearch/Subtitles/' + id;

        ApiClient.ajax({

            type: "POST",
            url: ApiClient.getUrl(url)

        }).done(function () {

            Dashboard.alert(Globalize.translate('MessageDownloadQueued'));
        });
    }

    function deleteLocalSubtitle(page, index) {

        var msg = Globalize.translate('MessageAreYouSureDeleteSubtitles');

        Dashboard.confirm(msg, Globalize.translate('HeaderConfirmDeletion'), function (result) {

            if (result) {

                Dashboard.showLoadingMsg();

                var url = 'Videos/' + currentItem.Id + '/Subtitles/' + index;

                ApiClient.ajax({

                    type: "DELETE",
                    url: ApiClient.getUrl(url)

                }).done(function () {

                    reload(page);
                });

            }
        });
    }

    function fillSubtitleList(page, item) {

        var streams = item.MediaStreams || [];

        var subs = streams.filter(function (s) {

            return s.Type == 'Subtitle';
        });

        var html = '';

        if (subs.length) {

            html += '<br/>';
            html += '<ul data-role="listview" data-split-icon="delete"><li data-role="list-divider">' + Globalize.translate('HeaderCurrentSubtitles') + '</li>';

            html += subs.map(function (s) {

                var cssClass = s.Path ? 'btnViewSubtitles' : '';

                var itemHtml = '<li><a class="' + cssClass + '" href="#" data-index="' + s.Index + '">';

                itemHtml += '<p>' + (s.Language || Globalize.translate('LabelUnknownLanaguage')) + '</p>';

                if (s.IsDefault || s.IsForced) {

                    var atts = [];

                    if (s.IsDefault) {

                        atts.push('Default');
                    }
                    if (s.IsForced) {

                        atts.push('Forced');
                    }

                    itemHtml += '<p>' + atts.join(', ') + '</p>';
                }

                if (s.Path) {
                    itemHtml += '<p>' + (s.Path) + '</p>';
                }

                itemHtml += '</a>';

                if (s.Path) {
                    itemHtml += '<a href="#" data-icon="delete" class="btnDelete" data-index="' + s.Index + '">' + Globalize.translate('Delete') + '</a>';
                } else {
                    itemHtml += '<a href="#" data-icon="delete" style="display:none;" class="btnDelete" data-index="' + s.Index + '">' + Globalize.translate('Delete') + '</a>';
                }

                itemHtml += '</li>';

                return itemHtml;

            }).join('');

            html += '</ul>';
        }

        var elem = $('.subtitleList', page).html(html).trigger('create');

        $('.btnViewSubtitles', elem).on('click', function () {

            var index = this.getAttribute('data-index');

            showLocalSubtitles(page, index);

        });

        $('.btnDelete', elem).on('click', function () {

            var index = this.getAttribute('data-index');

            deleteLocalSubtitle(page, index);

        });
    }

    function fillLanguages(page, languages) {

        $('#selectLanguage', page).html(languages.map(function (l) {

            return '<option value="' + l.ThreeLetterISOLanguageName + '">' + l.DisplayName + '</option>';

        })).selectmenu('refresh');

        Dashboard.getCurrentUser().done(function (user) {

            var lang = user.Configuration.SubtitleLanguagePreference;

            if (lang) {
                $('#selectLanguage', page).val(lang).selectmenu('refresh');
            }
        });
    }

    function renderSearchResults(page, results) {

        var lastProvider = '';
        var html = '';

        if (!results.length) {

            $('.noSearchResults', page).show();
            $('.subtitleResults', page).html('');
            Dashboard.hideLoadingMsg();
            return;
        }

        $('.noSearchResults', page).hide();

        html += '<ul data-role="listview">';

        for (var i = 0, length = results.length; i < length; i++) {

            var result = results[i];

            var provider = result.ProviderName;

            if (provider != lastProvider) {
                html += '<li data-role="list-divider">' + provider + '<span class="ui-li-count ui-body-inherit">' + Globalize.translate('HeaderRatingsDownloads') + '</span></li>';
                lastProvider = provider;
            }

            html += '<li><a class="btnViewSubtitle" href="#" data-subid="' + result.Id + '">';

            html += '<h3>' + (result.Name) + '</h3>';
            html += '<p>' + (result.Format) + '</p>';

            if (result.Comment) {
                html += '<p>' + (result.Comment) + '</p>';
            }

            html += '<div class="ui-li-count">' + (result.CommunityRating || 0) + ' / ' + (result.DownloadCount || 0) + '</div>';

            html += '</a>';

            html += '<a href="#" class="btnDownload" data-icon="plus" data-subid="' + result.Id + '">' + Globalize.translate('ButtonDownload') + '</a>';

            html += '</li>';
        }

        html += '</ul>';
        var elem = $('.subtitleResults', page).html(html).trigger('create');

        $('.btnViewSubtitle', elem).on('click', function () {

            var id = this.getAttribute('data-subid');
            showRemoteSubtitles(page, id);
        });

        $('.btnDownload', elem).on('click', function () {

            var id = this.getAttribute('data-subid');
            downloadRemoteSubtitles(page, id);
        });

        Dashboard.hideLoadingMsg();
    }

    function searchForSubtitles(page, language) {

        Dashboard.showLoadingMsg();

        var url = ApiClient.getUrl('Items/' + currentItem.Id + '/RemoteSearch/Subtitles/' + language);

        ApiClient.getJSON(url).done(function (results) {

            renderSearchResults(page, results);
        });
    }

    function reload(page) {

        $('.noSearchResults', page).hide();

        MetadataEditor.getItemPromise().done(function (item) {

            currentItem = item;

            LibraryBrowser.renderName(item, $('.itemName', page), true);

            fillSubtitleList(page, item);

            Dashboard.hideLoadingMsg();
        });
    }

    function onSearchSubmit() {
        var form = this;

        var lang = $('#selectLanguage', form).val();

        searchForSubtitles($(form).parents('.page'), lang);

        return false;
    }

    $(document).on('pageinitdepends', "#editItemMetadataPage", function () {

        var page = this;

        $('.subtitleSearchForm').off('submit', onSearchSubmit).on('submit', onSearchSubmit);

        $(page.querySelector('neon-animated-pages')).on('tabchange', function () {

            if (parseInt(this.selected) == 1) {
                var tabContent = page.querySelector('.subtitleTabContent');

                $('.subtitleResults', tabContent).empty();

                Dashboard.showLoadingMsg();

                reload(tabContent);

                ApiClient.getCultures().done(function (languages) {

                    fillLanguages(tabContent, languages);
                });
            }
        });

    });

})(jQuery, window, document);