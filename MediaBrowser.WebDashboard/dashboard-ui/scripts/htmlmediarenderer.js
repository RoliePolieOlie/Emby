﻿(function () {

    var supportsTextTracks;
    var isViblastStarted;
    var requiresSettingStartTimeOnStart;

    function htmlMediaRenderer(options) {

        var mediaElement;
        var self = this;

        function onEnded() {
            $(self).trigger('ended');
        }

        function onTimeUpdate() {

            if (isViblastStarted) {

                // This is a workaround for viblast not stopping playback at the end
                var time = this.currentTime;
                var duration = this.duration;

                if (duration) {
                    if (time >= (duration - 1)) {

                        onEnded();
                        return;
                    }
                }
            }

            $(self).trigger('timeupdate');
        }

        function onVolumeChange() {
            $(self).trigger('volumechange');
        }

        function onOneAudioPlaying() {
            $('.mediaPlayerAudioContainer').hide();
        }

        function onPlaying() {
            $(self).trigger('playing');
        }

        function onPlay() {
            $(self).trigger('play');
        }

        function onPause() {
            $(self).trigger('pause');
        }

        function onClick() {
            $(self).trigger('click');
        }

        function onDblClick() {
            $(self).trigger('dblclick');
        }

        function onError() {

            var errorCode = this.error ? this.error.code : '';
            Logger.log('Media element error code: ' + errorCode);

            $(self).trigger('error');
        }

        function onLoadedMetadata() {

            if (!isViblastStarted) {
                this.play();
            }
        }

        var viblastKey = 'N8FjNTQ3NDdhZqZhNGI5NWU5ZTI=';

        function requireViblast(callback) {
            require(['thirdparty/viblast/viblast.js'], function () {

                if (htmlMediaRenderer.customViblastKey) {
                    callback();
                } else {
                    downloadViblastKey(callback);
                }
            });
        }

        function downloadViblastKey(callback) {

            var headers = {};
            headers['X-Emby-Token'] = 'EMBY_SERVER';

            HttpClient.send({
                type: 'GET',
                url: 'https://mb3admin.com/admin/service/registration/getViBlastKey',
                headers: headers

            }).done(function (key) {

                htmlMediaRenderer.customViblastKey = key;
                callback();
            }).fail(function () {
                callback();
            });
        }

        function getViblastKey() {
            return htmlMediaRenderer.customViblastKey || viblastKey;
        }

        function getStartTime(url) {

            var src = url;

            var parts = src.split('#');

            if (parts.length > 1) {

                parts = parts[parts.length - 1].split('=');

                if (parts.length == 2) {

                    return parseFloat(parts[1]);
                }
            }

            return 0;
        }

        function onOneVideoPlaying() {

            var requiresNativeControls = !self.enableCustomVideoControls();

            if (requiresNativeControls) {
                $(this).attr('controls', 'controls');
            }

            if (requiresSettingStartTimeOnStart) {
                var src = (self.currentSrc() || '').toLowerCase();

                var startPositionInSeekParam = getStartTime(src);

                // Appending #t=xxx to the query string doesn't seem to work with HLS
                if (startPositionInSeekParam && src.indexOf('.m3u8') != -1) {
                    var element = this;
                    setTimeout(function () {
                        element.currentTime = startPositionInSeekParam;
                    }, 2500);
                }
            }
        }

        function createAudioElement() {

            var elem = $('.mediaPlayerAudio');

            if (!elem.length) {
                var html = '';

                var requiresControls = !MediaPlayer.canAutoPlayAudio();

                if (requiresControls) {
                    html += '<div class="mediaPlayerAudioContainer"><div class="mediaPlayerAudioContainerInner">';;
                } else {
                    html += '<div class="mediaPlayerAudioContainer" style="display:none;"><div class="mediaPlayerAudioContainerInner">';;
                }

                html += '<audio class="mediaPlayerAudio" crossorigin="anonymous" controls>';
                html += '</audio></div></div>';

                $(document.body).append(html);

                elem = $('.mediaPlayerAudio');
            }

            return $(elem)
	            .on('timeupdate', onTimeUpdate)
	            .on('ended', onEnded)
	            .on('volumechange', onVolumeChange)
	            .one('playing', onOneAudioPlaying)
	            .on('play', onPlay)
	            .on('pause', onPause)
	            .on('playing', onPlaying)
	            .on('error', onError)[0];
        }

        function enableViblast(src) {

            if (src) {
                if (src.indexOf('.m3u8') == -1) {
                    return false;
                }
            }

            return MediaPlayer.canPlayHls() && !MediaPlayer.canPlayNativeHls();
        }

        function createVideoElement() {

            var html = '';

            var requiresNativeControls = !self.enableCustomVideoControls();

            var poster = options.poster ? (' poster="' + options.poster + '"') : '';

            // Can't autoplay in these browsers so we need to use the full controls
            if (requiresNativeControls && AppInfo.isNativeApp && $.browser.android) {
                html += '<video class="itemVideo" id="itemVideo" preload="metadata" autoplay="autoplay" crossorigin="anonymous"' + poster + ' webkit-playsinline>';
            }
            else if (requiresNativeControls) {
                html += '<video class="itemVideo" id="itemVideo" preload="metadata" autoplay="autoplay" crossorigin="anonymous"' + poster + ' controls="controls" webkit-playsinline>';
            }
            else {

                // Chrome 35 won't play with preload none
                html += '<video class="itemVideo" id="itemVideo" preload="metadata" autoplay="autoplay" crossorigin="anonymous"' + poster + ' webkit-playsinline>';
            }

            html += '</video>';

            var elem = $('#videoElement', '#mediaPlayer').prepend(html);

            return $('.itemVideo', elem)
            	.one('.loadedmetadata', onLoadedMetadata)
            	.one('playing', onOneVideoPlaying)
	            .on('timeupdate', onTimeUpdate)
	            .on('ended', onEnded)
	            .on('volumechange', onVolumeChange)
	            .on('play', onPlay)
	            .on('pause', onPause)
	            .on('playing', onPlaying)
	            .on('click', onClick)
	            .on('dblclick', onDblClick)
	            .on('error', onError)[0];
        }

        // Save this for when playback stops, because querying the time at that point might return 0
        var _currentTime;
        self.currentTime = function (val) {

            if (mediaElement) {
                if (val != null) {
                    mediaElement.currentTime = val / 1000;
                    return;
                }

                if (_currentTime) {
                    return _currentTime * 1000;
                }

                return (mediaElement.currentTime || 0) * 1000;
            }
        };

        self.duration = function (val) {

            if (mediaElement) {
                return mediaElement.duration;
            }

            return null;
        };

        self.stop = function () {
            if (mediaElement) {
                mediaElement.pause();

                if (isViblastStarted) {
                    _currentTime = mediaElement.currentTime;

                    viblast(mediaElement).stop();
                    isViblastStarted = false;
                }
            }
        };

        self.pause = function () {
            if (mediaElement) {
                mediaElement.pause();
            }
        };

        self.unpause = function () {
            if (mediaElement) {
                mediaElement.play();
            }
        };

        self.volume = function (val) {
            if (mediaElement) {
                if (val != null) {
                    mediaElement.volume = val;
                    return;
                }

                return mediaElement.volume;
            }
        };

        var currentSrc;
        self.setCurrentSrc = function (val, item, mediaSource, tracks) {

            var elem = mediaElement;

            if (!elem) {
                currentSrc = null;
                return;
            }

            if (!val) {
                currentSrc = null;
                elem.src = null;
                elem.src = "";

                // When the browser regains focus it may start auto-playing the last video
                if ($.browser.safari) {
                    elem.src = 'files/dummy.mp4';
                    elem.play();
                }

                return;
            }

            requiresSettingStartTimeOnStart = false;
            var startTime = getStartTime(val);

            if (elem.tagName.toLowerCase() == 'audio') {

                elem.src = val;
                elem.play();

            }
            else {

                if (isViblastStarted) {
                    viblast(elem).stop();
                    isViblastStarted = false;
                }

                if (startTime) {

                    try {
                        elem.currentTime = startTime;
                    } catch (err) {
                        // IE will throw an invalid state exception when trying to set currentTime before starting playback
                    }
                    requiresSettingStartTimeOnStart = elem.currentTime == 0;
                }

                if (enableViblast(val)) {

                    setTracks(elem, tracks || []);

                    viblast(elem).setup({
                        key: getViblastKey(),
                        stream: val
                    });

                    isViblastStarted = true;

                } else {

                    elem.src = val;

                    setTracks(elem, tracks || []);

                    $(elem).one("loadedmetadata", onLoadedMetadata);
                }
            }

            currentSrc = val;
        };

        function setTracks(elem, tracks) {
            var html = tracks.map(function (t) {

                var defaultAttribute = t.isDefault ? ' default' : '';

                return '<track kind="subtitles" src="' + t.url + '" srclang="' + t.language + '"' + defaultAttribute + '></track>';

            }).join('');

            if (html) {
                elem.innerHTML = html;
            }
        }

        self.currentSrc = function () {
            if (mediaElement) {
                // We have to use this cached value because viblast will muck with the url
                return currentSrc;
                //return mediaElement.currentSrc;
            }
        };

        self.paused = function () {

            if (mediaElement) {
                return mediaElement.paused;
            }

            return false;
        };

        self.cleanup = function (destroyRenderer) {

            self.setCurrentSrc(null);
            _currentTime = null;

            var elem = mediaElement;

            if (elem) {

                if (elem.tagName == 'AUDIO') {

                    Events.off(elem, 'timeupdate', onTimeUpdate);
                    Events.off(elem, 'ended', onEnded);
                    Events.off(elem, 'volumechange', onVolumeChange);
                    Events.off(elem, 'playing', onOneAudioPlaying);
                    Events.off(elem, 'play', onPlay);
                    Events.off(elem, 'pause', onPause);
                    Events.off(elem, 'playing', onPlaying);
                    Events.off(elem, 'error', onError);

                } else {

                    Events.off(elem, 'loadedmetadata', onLoadedMetadata);
                    Events.off(elem, 'playing', onOneVideoPlaying);
                    Events.off(elem, 'timeupdate', onTimeUpdate);
                    Events.off(elem, 'ended', onEnded);
                    Events.off(elem, 'volumechange', onVolumeChange);
                    Events.off(elem, 'play', onPlay);
                    Events.off(elem, 'pause', onPause);
                    Events.off(elem, 'playing', onPlaying);
                    Events.off(elem, 'click', onClick);
                    Events.off(elem, 'dblclick', onDblClick);
                    Events.off(elem, 'error', onError);
                }

                if (elem.tagName.toLowerCase() != 'audio') {
                    $(elem).remove();
                }
            }
        };

        self.supportsTextTracks = function () {

            if (supportsTextTracks == null) {
                supportsTextTracks = document.createElement('video').textTracks != null;
            }

            // For now, until ready
            return supportsTextTracks;
        };

        self.setCurrentTrackElement = function (trackIndex) {

            Logger.log('Setting new text track index to: ' + trackIndex);

            var allTracks = mediaElement.textTracks; // get list of tracks

            var modes = ['disabled', 'showing', 'hidden'];

            for (var i = 0; i < allTracks.length; i++) {

                var mode;

                if (trackIndex == i) {
                    mode = 1; // show this track
                } else {
                    mode = 0; // hide all other tracks
                }

                Logger.log('Setting track ' + i + ' mode to: ' + mode);

                // Safari uses integers for the mode property
                // http://www.jwplayer.com/html5/scripting/
                var useNumericMode = false;

                if (!isNaN(allTracks[i].mode)) {
                    useNumericMode = true;
                }

                if (useNumericMode) {
                    allTracks[i].mode = mode;
                } else {
                    allTracks[i].mode = modes[mode];
                }
            }
        };

        self.updateTextStreamUrls = function (startPositionTicks) {

            if (!self.supportsTextTracks()) {
                return;
            }

            var allTracks = mediaElement.textTracks; // get list of tracks

            for (var i = 0; i < allTracks.length; i++) {

                var track = allTracks[i];

                // This throws an error in IE, but is fine in chrome
                // In IE it's not necessary anyway because changing the src seems to be enough
                try {
                    while (track.cues.length) {
                        track.removeCue(track.cues[0]);
                    }
                } catch (e) {
                    Logger.log('Error removing cue from textTrack');
                }
            }

            $('track', mediaElement).each(function () {

                this.src = replaceQueryString(this.src, 'startPositionTicks', startPositionTicks);

            });
        };

        self.enableCustomVideoControls = function () {

            return self.canAutoPlayVideo() && !$.browser.mobile;
        };

        self.canAutoPlayVideo = function () {

            if (AppInfo.isNativeApp) {
                return true;
            }

            if ($.browser.mobile) {
                return false;
            }

            return true;
        };

        self.init = function () {

            var deferred = DeferredBuilder.Deferred();

            if (options.type == 'video' && enableViblast()) {

                requireViblast(function () {

                    deferred.resolve();
                });

            } else {
                deferred.resolve();
            }

            return deferred.promise();
        };

        if (options.type == 'audio') {
            mediaElement = createAudioElement();
        }
        else {
            mediaElement = createVideoElement();
        }
    }

    if (!window.AudioRenderer) {
        window.AudioRenderer = function (options) {
            options = options || {};
            options.type = 'audio';

            return new htmlMediaRenderer(options);
        };
    }

    if (!window.VideoRenderer) {
        window.VideoRenderer = function (options) {
            options = options || {};
            options.type = 'video';

            return new htmlMediaRenderer(options);
        };
    }

})();