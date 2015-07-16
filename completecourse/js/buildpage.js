var baseURL;

if (window.location.hostname == "localhost") {
	baseURL = "../completecourse/";
} else {
	baseURL = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/";
}

requirejs.config({
	baseUrl: baseURL + "js/",
	paths: {
		"jquery": "jquery-2.1.3.min",
		"jquery.ui": "jquery-ui.min",
		"jquery.json": "jquery.json.min",
		"jquery.onscreen": "jquery.onscreen",
		"bootstrap": "bootstrap",
		"bootstrap-notify": "bootstrap-notify.min",
		"bootstrap-dialog": "bootstrap-dialog.min",
		"imagesloaded": "imagesloaded.pkgd.min",
		"popcorn": "popcorn-complete.min",
		"bootstrap-toolkit": "bootstrap-toolkit.min",
		"videojs": "video.dev",
		"videojs-markers": "videojs-markers",
		"handlebars": "handlebars-v3.0.3",
		"lunr": "lunr.min"
	},
	shim: {
		"jquery": {
			export: "$"
		},
		"jquery.ui": {
			export: "$"
		},
		"jquery.json": {
			export: "$",
			deps: ['jquery']
		},
		"jquery.onscreen": {
			export: "$",
			deps: ['jquery']
		},
		"bootstrap": {
			export: "$",
			deps: ['jquery']
		},
		"bootstrap-notify": {
			export: "$",
			deps: ['bootstrap']
		},
		"bootstrap-dialog": {
			deps: ['bootstrap']
		},
		"popcorn": {
			export: "Popcorn"
		},
		"popcorn.timebase": {
			export: "Popcorn",
			deps: ['popcorn']
		},
		"bootstrap-toolkit": {
			export: "$",
			deps: ["jquery"]
		},
		"videojs": {
			export: "videojs",
			deps: ["jquery"]
		},
		"videojs-markers": {
			deps: ["videojs", "jquery"]
		},
		"imagesloaded": {
			export: "$",
			deps: ["jquery"]
		},
		"handlebars": {
			exports: "Handlebars"
		}
	},
	// this fixed the "appending .js" problem I was getting on informit.com
	config: {
		text: {
			useXhr: function (url, protocol, hostname, port) {
				return true;
			}
		}
	}
});

define(["jquery", "handlebars", "text!viewer_template.html", "video-manager", "video-overlay", "toc-tree", "videojs", "popcorn", "popcorn.timebase", "bootstrap-toolkit"], function ($, Handlebars, viewerTemplate, VideoManager) {
	var manifest;

	var contentsPaneDesiredVisible = undefined;
	var lastSize = undefined;

	function initialize () {
		onResize();

		var v = $("#video .overlay").VideoOverlay();

		// NOTE: started using opacity too since the tab panels were overriding "invisible"
		$("#main").removeClass("invisible").css("opacity", 1);

		/*
		 if (!coachMarksShown) {
		 $("#coach-marks").CoachMarks().CoachMarks("instance").open();
		 coachMarksShown = true;
		 }
		 */

		$(".toc").on("playvideo", onPlayContent);
	}

	function onPlayContent () {
		var currentSize = ResponsiveBootstrapToolkit.current();

		if (currentSize == "xs") {
			resizePanes(false, false);
			matchToggleButtonToVisibility();
		}
	}

	function onResize () {
		var wh = $(window).outerHeight();

		$("#contents").outerHeight(wh - 50);
		$("#video").outerHeight(wh - 50);
		$("#sidebar").outerHeight(wh - 50);

		// kludge to subtract main menu bar and course progress
		$("#contents .scroller").height(wh - 50 - 50);

		$("#main_video").css("max-height", wh - 50);

		doResponsiveLogic();
	}

	function matchToggleButtonToVisibility () {
		if ($("#contents").hasClass("col-xs-0")) {
			$("#toc-toggler").removeClass("open");
		} else {
			$("#toc-toggler").addClass("open");
		}
	}

	// THEORY: hide the TOC every time we switch to xs
	function doResponsiveLogic () {
		ResponsiveBootstrapToolkit.changed(function () {
			var currentSize = ResponsiveBootstrapToolkit.current();
			if (currentSize != lastSize) {
				if (currentSize == "xs") {
					var desired = contentsPaneDesiredVisible;
					if (desired == undefined) desired = false;

					resizePanes(desired, false);

					wasSmall = true;
				} else {
					var desired = contentsPaneDesiredVisible;
					if (desired == undefined) desired = true;

					resizePanes(desired, false);

					wasSmall = false;
				}

				matchToggleButtonToVisibility();

				lastSize = currentSize;
			}

			contentsPaneDesiredVisible = undefined;
		});
	}

	function addLinkToCSS (url) {
		var link = $("<link/>",
			{ rel: "stylesheet", href: url, type: "text/css" });
		$("head").append(link);
	}

	function convertHabitatTOCtoMetadata (data) {
		var links = $(data).find("a");

		var metadata = links.map(function (index, item) {
			var a = $(item);
			var href = a.attr("href");
			var hash = VideoManager.HashInURL(href);
			return {
				desc: a.text(),
				src: manifest.folder + "/ops/" + href,
				hash: hash
			};
		});

		return metadata;
	}

	function onLoadedTOC (metadata) {
		$(".toc").TOCTree({ data: metadata.toc, expander: "#collapse-button" });

		$(".resource-list").TOCTree();

		VideoManager.initialize(metadata.toc, "#video video", videojs("main_video"), metadata.markers, manifest);

		initialize();

		if (metadata.title) {
			setProjectTitle(metadata.title);
		}

		if (metadata.posterImage) {
			videojs("main_video").poster(metadata.posterImage);
		}

		VideoManager.loadMostRecentVideo();
	}

	function onHabitatTOCLoaded (data) {
		var metadata = convertHabitatTOCtoMetadata(data);

		$(".toc").TOCTree({ type: "habitat", data: data, metadata: metadata, expander: "#collapse-button" });

		VideoManager.initialize(metadata, "#video video", videojs("main_video"), [], manifest);

		initialize();

		VideoManager.loadMostRecentVideo();
	}

	function loadContent () {
		switch (manifest.type) {
			case "metadata":
				require(["toc.js"], onLoadedTOC);
				break;
			case "habitat":
				$.get(manifest.folder + "/ops/toc.html", onHabitatTOCLoaded);
				// loading toc.html via "get" gets a 500 error on manageit
				// loading toc.xhtml via "get" gets a 403 error on manageit (cross-origin?)
				// loading toc.html via require gets a 500 error on manageit
				// loading toc.xhtml via require gets a 403 error on manageit (cross-origin?)
				/*
				var path = getAbsolutePath() + "/" + manifest.folder + "/OPS/toc.xhtml";
				console.log("path = " + path);
				require(["text!" + path], function () { console.log("was able to open toc"); });
				*/
				break;
		}
	}

	function getAbsolutePath () {
		var loc = window.location;
		var pathName = loc.pathname.substring(0, loc.pathname.lastIndexOf('/'));
		return loc.origin + pathName;
	}

	function resizePanes (contentsVisible, resourcesVisible) {
		var xs = ResponsiveBootstrapToolkit.is("xs");
		var md = ResponsiveBootstrapToolkit.is(">=md");

		// xs = 3, 6, 3
		// md = 3, 7, 2

		var contentsSize = 3, resourcesSize = md ? 2 : 3;

		var videoSize = 12 - (contentsVisible ? contentsSize : 0) - (resourcesVisible ? resourcesSize : 0);

		if (xs) {
			if (contentsPaneDesiredVisible) {
				contentsVisible = true;
				videoSize = 0;
				contentsSize = 12;
				//$("#contents .scroller").show(0);
			} else {
				contentsVisible = false;
				videoSize = 12;
				contentsSize = 0;
				//$("#contents .scroller").show(0);
			}
		}

		if (contentsVisible) {
			$("#contents").removeClass("col-xs-0").addClass("col-xs-" + contentsSize);
		} else {
			$("#contents").removeClass("col-xs-3").addClass("col-xs-0");
		}

		if (resourcesVisible) {
			$("#sidebar").removeClass("col-xs-0").addClass("col-xs-" + resourcesSize);
		} else {
			$("#sidebar").removeClass("col-xs-3 col-xs-2").addClass("col-xs-0");
		}

		$("#video").removeClass("col-xs-0 col-xs-6 col-xs-7 col-xs-8 col-xs-9 col-xs-11 col-xs-12").addClass("col-xs-" + videoSize);
	}

	function onToggleTOC () {
		contentsPaneDesiredVisible = !$("#toc-toggler").hasClass("open");

		var contentsVisible = !$("#contents").hasClass("col-xs-0");
		var resourcesVisible = $("#sidebar").is(":visible");

		resizePanes(!contentsVisible, resourcesVisible);

		//$("#contents .scroller").toggle("slide");

		$("#toc-toggler").toggleClass("open");

		onResize();
	}

	function onSearch () {
		var term = $("#query").val();
		$(".toc").TOCTree("search", term);
	}

	function onCloseSearch () {
		$(".toc").TOCTree("closeSearch");
	}

	function onClearSearch () {
		$("#query").val("");
		$(".toc").TOCTree("closeSearch", "");
	}

	function setProjectTitle (title) {
		$("a#home-button").text(title);
		$("title").text(title);
	}

	var BuildPage = {
		build: function (options) {
			var template = Handlebars.compile(viewerTemplate);
			var context = { title: options.title };
			var html = template(context);

			$("body").append($(html));

			addLinkToCSS(baseURL + "css/bootstrap.min.css");
			addLinkToCSS(baseURL + "css/bootstrap-theme.min.css");
			addLinkToCSS(baseURL + "css/animate.css");
			addLinkToCSS(baseURL + "css/font-awesome.min.css");
			addLinkToCSS(baseURL + "css/video-js.min.css");
			addLinkToCSS(baseURL + "css/bootstrap-dialog.min.css");
			addLinkToCSS(baseURL + "css/videojs.markers.min.css");
			addLinkToCSS(baseURL + "css/main.css");

			manifest = options;

			loadContent();

			$(window).resize(onResize);

			//$(".show-all-markers").click(onShowAllMarkers);
			$("#toc-toggler").click(onToggleTOC);
			//$("#resource-toggler").click(onToggleResources);
			//$("a[data-toggle='tab']").on("shown.bs.tab", onResize);
			//$(".resource-list").on("playvideo", onClickMarker);

			$(".search-button").click(onSearch);
			$(".search-results .close-btn").click(onCloseSearch);

			$("#query").on("input", onSearch);
			$("#clear-search-button").click(onClearSearch);

			$("#account-button").click(function () { window.open("//memberservices.informit.com/my_account/index.aspx"); });
		},

		setSearchIndex: function (data) {
			$(".toc").TOCTree("setSearchIndex", data);
		}
	};

	return BuildPage;
});