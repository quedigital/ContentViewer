requirejs.config({
	baseUrl: "js",
	paths: {
		"jquery": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/jquery-2.1.3.min",
		"jquery.ui": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/jquery-ui.min",
		"bootstrap": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/bootstrap.min"
	},
	shim: {
		"jquery": {
			export: "$"
		},
		"jquery.ui": {
			deps: ["jquery"],
			export: "$"
		},
		"bootstrap": {
			deps: ["jquery"]
		}
	}
});

define(["jquery", "quizzerator"], function ($) {
	$("#quiz1").quizzerator();
});
