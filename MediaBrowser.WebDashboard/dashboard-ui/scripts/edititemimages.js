﻿(function ($, document, window, FileReader, escape) {

    var currentItem;
    var currentFile;

    var browsableImagePageSize = 10;
    var browsableImageStartIndex = 0;
    var browsableImageType = 'Primary';
    var selectedProvider;

    function getBaseRemoteOptions() {

        var options = {};

        options.itemId = currentItem.Id;

        return options;
    }

    function reloadBrowsableImages(page) {

        Dashboard.showLoadingMsg();

        var options = getBaseRemoteOptions();

        options.type = browsableImageType;
        options.startIndex = browsableImageStartIndex;
        options.limit = browsableImagePageSize;
        options.IncludeAllLanguages = $('#chkAllLanguages', page).checked();

        var provider = selectedProvider || '';

        if (provider) {
            options.ProviderName = provider;
        }

        ApiClient.getAvailableRemoteImages(options).done(function (result) {

            renderRemoteImages(page, currentItem, result, browsableImageType, options.startIndex, options.limit);

            $('#selectBrowsableImageType', page).val(browsableImageType).selectmenu('refresh');

            var providersHtml = result.Providers.map(function (p) {
                return '<option value="' + p + '">' + p + '</option>';
            });

            $('#selectImageProvider', page).html('<option value="">' + Globalize.translate('LabelAll') + '</option>' + providersHtml).val(provider).selectmenu('refresh');

            Dashboard.hideLoadingMsg();
        });

    }

    function renderRemoteImages(page, item, imagesResult, imageType, startIndex, limit) {

        $('.availableImagesPaging', page).html(getPagingHtml(startIndex, limit, imagesResult.TotalRecordCount)).trigger('create');

        var html = '';

        for (var i = 0, length = imagesResult.Images.length; i < length; i++) {

            html += getRemoteImageHtml(imagesResult.Images[i], imageType);
        }

        $('.availableImagesList', page).html(html).trigger('create');

        $('.btnNextPage', page).on('click', function () {
            browsableImageStartIndex += browsableImagePageSize;
            reloadBrowsableImages(page);
        });

        $('.btnPreviousPage', page).on('click', function () {
            browsableImageStartIndex -= browsableImagePageSize;
            reloadBrowsableImages(page);
        });

        $('.btnDownloadRemoteImage', page).on('click', function () {

            downloadRemoteImage(page, this.getAttribute('data-imageurl'), this.getAttribute('data-imagetype'), this.getAttribute('data-imageprovider'));
        });

    }

    function downloadRemoteImage(page, url, type, provider) {

        var options = getBaseRemoteOptions();

        options.Type = type;
        options.ImageUrl = url;
        options.ProviderName = provider;

        Dashboard.showLoadingMsg();

        ApiClient.downloadRemoteImage(options).done(function () {

            $('.popupDownload', page).popup("close");
            reload(page);
        });
    }

    function getDisplayUrl(url) {
        return ApiClient.getUrl("Images/Remote", { imageUrl: url });
    }

    function getRemoteImageHtml(image, imageType) {

        var html = '';

        html += '<div class="remoteImageContainer">';

        var cssClass = "remoteImage";

        if (imageType == "Backdrop" || imageType == "Art" || imageType == "Thumb" || imageType == "Logo") {
            cssClass += " remoteBackdropImage";
        }
        else if (imageType == "Banner") {
            cssClass += " remoteBannerImage";
        }
        else if (imageType == "Disc") {
            cssClass += " remoteDiscImage";
        }
        else {

            if (currentItem.Type == "Episode") {
                cssClass += " remoteBackdropImage";
            }
            else if (currentItem.Type == "MusicAlbum" || currentItem.Type == "MusicArtist") {
                cssClass += " remoteDiscImage";
            }
            else {
                cssClass += " remotePosterImage";
            }
        }

        var displayUrl = getDisplayUrl(image.ThumbnailUrl || image.Url);

        html += '<a target="_blank" href="' + getDisplayUrl(image.Url) + '" class="' + cssClass + '" style="background-image:url(\'' + displayUrl + '\');">';
        html += '</a>';

        html += '<div class="remoteImageDetails">';
        html += image.ProviderName;
        html += '</div>';

        if (image.Width || image.Height || image.Language) {

            html += '<div class="remoteImageDetails">';

            if (image.Width || image.Height) {
                html += image.Width + ' x ' + image.Height;

                if (image.Language) {

                    html += ' • ' + image.Language;
                }
            } else {
                if (image.Language) {

                    html += image.Language;
                }
            }

            html += '</div>';
        }

        if (image.CommunityRating != null) {

            html += '<div class="remoteImageDetails">';

            if (image.RatingType == "Likes") {
                html += image.CommunityRating + (image.CommunityRating == 1 ? " like" : " likes");
            } else {

                if (image.CommunityRating) {
                    html += image.CommunityRating.toFixed(1);

                    if (image.VoteCount) {
                        html += ' • ' + image.VoteCount + (image.VoteCount == 1 ? " vote" : " votes");
                    }
                } else {
                    html += "Unrated";
                }
            }

            html += '</div>';
        }

        html += '<div><button class="btnDownloadRemoteImage" data-imageprovider="' + image.ProviderName + '" data-imageurl="' + image.Url + '" data-imagetype="' + image.Type + '" type="button" data-icon="arrow-d" data-mini="true">' + Globalize.translate('ButtonDownload') + '</button></div>';

        html += '</div>';

        return html;
    }

    function getPagingHtml(startIndex, limit, totalRecordCount) {

        var html = '';

        var recordsEnd = Math.min(startIndex + limit, totalRecordCount);

        // 20 is the minimum page size
        var showControls = totalRecordCount > limit;

        html += '<div class="listPaging">';

        html += '<span style="margin-right: 10px;">';

        var startAtDisplay = totalRecordCount ? startIndex + 1 : 0;
        html += startAtDisplay + '-' + recordsEnd + ' of ' + totalRecordCount;

        html += '</span>';

        if (showControls) {
            html += '<div data-role="controlgroup" data-type="horizontal" style="display:inline-block;">';
            html += '<button data-icon="arrow-l" data-iconpos="notext" data-inline="true" data-mini="true" class="btnPreviousPage" ' + (startIndex ? '' : 'disabled') + '>' + Globalize.translate('ButtonPreviousPage') + '</button>';

            html += '<button data-icon="arrow-r" data-iconpos="notext" data-inline="true" data-mini="true" class="btnNextPage" ' + (startIndex + limit > totalRecordCount ? 'disabled' : '') + '>' + Globalize.translate('ButtonNextPage') + '</button>';
            html += '</div>';
        }

        html += '</div>';

        return html;
    }

    function reload(page) {

        Dashboard.showLoadingMsg();

        browsableImageStartIndex = 0;
        browsableImageType = 'Primary';
        selectedProvider = null;

        MetadataEditor.getItemPromise().done(function (item) {

            currentItem = item;

            LibraryBrowser.renderName(item, $('.itemName', page), true);

            ApiClient.getRemoteImageProviders(getBaseRemoteOptions()).done(function (providers) {

                if (providers.length) {
                    $('.lnkBrowseAllImages', page).removeClass('hide');
                } else {
                    $('.lnkBrowseAllImages', page).addClass('hide');
                }

                ApiClient.getItemImageInfos(currentItem.Id).done(function (imageInfos) {

                    renderStandardImages(page, item, imageInfos, providers);
                    renderBackdrops(page, item, imageInfos, providers);
                    renderScreenshots(page, item, imageInfos, providers);
                    Dashboard.hideLoadingMsg();
                });
            });
        });
    }

    function renderImages(page, item, images, imageProviders, elem) {

        var html = '';

        for (var i = 0, length = images.length; i < length; i++) {

            var image = images[i];

            html += '<div class="editorTile imageEditorTile">';

            if (image.ImageType !== "Backdrop" && image.ImageType !== "Screenshot") {
                html += '<h3>' + image.ImageType + '</h3>';
            }

            var height = 150;

            html += '<div style="height:' + height + 'px;vertical-align:top;background-repeat:no-repeat;background-position:center center;background-size:contain;background-image:url(\'' + LibraryBrowser.getImageUrl(currentItem, image.ImageType, image.ImageIndex, { height: height }) + '\');"></div>';

            html += '<div class="editorTileInner">';

            html += '<p>' + image.Width + ' X ' + image.Height + '</p>';

            html += '<p>';

            if (image.ImageType == "Backdrop" || image.ImageType == "Screenshot") {

                if (i > 0) {
                    html += '<paper-icon-button icon="chevron-left" onclick="EditItemImagesPage.moveImage(\'' + image.ImageType + '\', ' + image.ImageIndex + ', ' + (i - 1) + ');" title="' + Globalize.translate('ButtonMoveLeft') + '"></paper-icon-button>';
                } else {
                    html += '<paper-icon-button icon="chevron-left" disabled title="' + Globalize.translate('ButtonMoveLeft') + '"></paper-icon-button>';
                }

                if (i < length - 1) {
                    html += '<paper-icon-button icon="chevron-right" onclick="EditItemImagesPage.moveImage(\'' + image.ImageType + '\', ' + image.ImageIndex + ', ' + (i + 1) + ');" title="' + Globalize.translate('ButtonMoveRight') + '"></paper-icon-button>';
                } else {
                    html += '<paper-icon-button icon="chevron-right" disabled title="' + Globalize.translate('ButtonMoveRight') + '"></paper-icon-button>';
                }
            }

            if (imageProviders.length) {
                html += '<paper-icon-button icon="cloud" onclick="EditItemImagesPage.showDownloadMenu(\'' + image.ImageType + '\');" title="' + Globalize.translate('ButtonBrowseOnlineImages') + '"></paper-icon-button>';
            }

            html += '<paper-icon-button icon="delete" onclick="EditItemImagesPage.deleteImage(\'' + image.ImageType + '\', ' + (image.ImageIndex != null ? image.ImageIndex : "null") + ');" title="' + Globalize.translate('Delete') + '"></paper-icon-button>';

            html += '</p>';

            html += '</div>';

            html += '</div>';
        }

        elem.html(html).trigger('create');
    }

    function renderStandardImages(page, item, imageInfos, imageProviders) {

        var images = imageInfos.filter(function (i) {
            return i.ImageType != "Screenshot" && i.ImageType != "Backdrop" && i.ImageType != "Chapter";
        });

        if (images.length) {
            $('#imagesContainer', page).show();
            renderImages(page, item, images, imageProviders, $('#images', page));
        } else {
            $('#imagesContainer', page).hide();
        }
    }

    function renderBackdrops(page, item, imageInfos, imageProviders) {

        var images = imageInfos.filter(function (i) {
            return i.ImageType == "Backdrop";

        }).sort(function (a, b) {
            return a.ImageIndex - b.ImageIndex;
        });

        if (images.length) {
            $('#backdropsContainer', page).show();
            renderImages(page, item, images, imageProviders, $('#backdrops', page));
        } else {
            $('#backdropsContainer', page).hide();
        }
    }

    function renderScreenshots(page, item, imageInfos, imageProviders) {

        var images = imageInfos.filter(function (i) {
            return i.ImageType == "Screenshot";

        }).sort(function (a, b) {
            return a.ImageIndex - b.ImageIndex;
        });

        if (images.length) {
            $('#screenshotsContainer', page).show();
            renderImages(page, item, images, imageProviders, $('#screenshots', page));
        } else {
            $('#screenshotsContainer', page).hide();
        }
    }

    function onFileReaderError(evt) {

        Dashboard.hideLoadingMsg();

        switch (evt.target.error.code) {
            case evt.target.error.NOT_FOUND_ERR:
                Dashboard.showError(Globalize.translate('MessageFileNotFound'));
                break;
            case evt.target.error.ABORT_ERR:
                break; // noop
            default:
                Dashboard.showError(Globalize.translate('MessageFileReadError'));
                break;
        };
    }

    function setFiles(page, files) {

        var file = files[0];

        if (!file || !file.type.match('image.*')) {
            $('#imageOutput', page).html('');
            $('#fldUpload', page).hide();
            currentFile = null;
            return;
        }

        currentFile = file;

        var reader = new FileReader();

        reader.onerror = onFileReaderError;
        reader.onloadstart = function () {
            $('#fldUpload', page).hide();
        };
        reader.onabort = function () {
            Dashboard.hideLoadingMsg();
            Logger.log('File read cancelled');
        };

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {

                // Render thumbnail.
                var html = ['<img style="max-width:300px;max-height:100px;" src="', e.target.result, '" title="', escape(theFile.name), '"/>'].join('');

                $('#imageOutput', page).html(html);
                $('#fldUpload', page).show();
            };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
    }

    function processImageChangeResult(page) {

        reload(page);
    }

    function onSubmit() {
        var file = currentFile;

        if (!file) {
            return false;
        }

        if (file.type != "image/png" && file.type != "image/jpeg" && file.type != "image/jpeg") {
            return false;
        }

        Dashboard.showLoadingMsg();

        var page = $.mobile.activePage;

        var imageType = $('#selectImageType', page).val();

        ApiClient.uploadItemImage(currentItem.Id, imageType, file).done(function () {

            $('#uploadImage', page).val('').trigger('change');
            $('#popupUpload', page).popup("close");
            processImageChangeResult(page);

        });

        return false;
    }

    function editItemImages() {

        var self = this;

        self.deleteImage = function (type, index) {

            var page = $.mobile.activePage;

            Dashboard.confirm(Globalize.translate('DeleteImageConfirmation'), Globalize.translate('HeaderDeleteImage'), function (result) {

                if (result) {
                    ApiClient.deleteItemImage(currentItem.Id, type, index).done(function () {

                        processImageChangeResult(page);

                    });
                }

            });


        };

        self.moveImage = function (type, index, newIndex) {

            var page = $.mobile.activePage;

            ApiClient.updateItemImageIndex(currentItem.Id, type, index, newIndex).done(function () {

                processImageChangeResult(page);

            });


        };

        self.showDownloadMenu = function (type) {
            browsableImageStartIndex = 0;
            browsableImageType = type;

            var page = $.mobile.activePage;

            selectedProvider = null;
            $('.popupDownload', page).popup('open');
            reloadBrowsableImages(page);
        };
    }

    window.EditItemImagesPage = new editItemImages();

    $(document).on('pageinitdepends', "#editItemMetadataPage", function () {

        var page = this;

        $('#selectBrowsableImageType', page).on('change', function () {

            browsableImageType = this.value;
            browsableImageStartIndex = 0;
            selectedProvider = null;

            reloadBrowsableImages(page);
        });

        $('#selectImageProvider', page).on('change', function () {

            browsableImageStartIndex = 0;
            selectedProvider = this.value;

            reloadBrowsableImages(page);
        });

        $('#chkAllLanguages', page).on('change', function () {

            browsableImageStartIndex = 0;

            reloadBrowsableImages(page);
        });

        $('.uploadItemImageForm').off('submit', onSubmit).on('submit', onSubmit);

        $('.btnOpenUploadMenu', page).on('click', function() {

            $('#popupUpload', page).popup('open');
        });

        $('.btnBrowseAllImages', page).on('click', function () {

            selectedProvider = null;
            browsableImageType = 'Primary';
            $('.popupDownload', page).popup('open');
            reloadBrowsableImages(page);
        });

        $('#uploadImage', page).on("change", function () {
            setFiles(page, this.files);
        });

        $("#imageDropZone", page).on('dragover', function (e) {

            e.preventDefault();

            e.originalEvent.dataTransfer.dropEffect = 'Copy';

            return false;

        }).on('drop', function (e) {

            e.preventDefault();

            setFiles(page, e.originalEvent.dataTransfer.files);

            return false;
        });

        $(page.querySelector('neon-animated-pages')).on('tabchange', function () {

            if (parseInt(this.selected) == 3) {
                var tabContent = page.querySelector('.imageEditorTab');

                reload(tabContent);
            }
        });
    });

})(jQuery, document, window, window.FileReader, escape);