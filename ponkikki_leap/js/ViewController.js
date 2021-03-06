var ytplayer;

function onYouTubePlayerReady(player) {
	ytplayer = document.getElementById("myytplayer");
	console.log("get");
  	ytplayer.addEventListener("onStateChange", "onytplayerStateChange");
	//ytplayer.playVideo();
}
function onytplayerStateChange(newState) {
	console.log(newState);
	if (newState == 0){
		vc.resetView();
	}
	if (newState == 1){
		vc.pausePlayer();
	}
}

/**
 * ViewController class
 *
 * @constructor
 */

function ViewController() {

	this.videoctx;
	this.drawctx;
	this.bufferctx;
	this.maskctx;

	this.videocanvas;
	this.drawcanvas;
	this.buffercanvas;
	this.maskctx;

	this.cwidth;
	this.cheight;
	this.height;
	this.width;

	this.isCarib = false;
	this.isStart = false;
	this.caribValue = [
		[-128,400,-10],
		[128,200,-10],
		{
			"rateX":2,
			"rateY":2
		}
	];
	this.pos;


	this.mode = 1; // 0:paint 1:window
	this.isTap = false;

	this.maskZoom = 1;
	this.startZoom = false;
	this.zoomEnd = false;
	this.videoVisible = false;
	this.prepos = {};
	this.prenewpos = {};

	this.sqValue = 0;

}

ViewController.prototype.init = function(){
	this.cwidth = 640;//window.innerWidth;
	this.cheight = 480;//window.innerHeight;
	this.width = window.innerWidth;
	this.height = window.innerHeight;

	var self = this;


    var $video = $("#video");
    this.videocanvas = $("#video-canvas").get(0);
    this.drawcanvas = $("#draw-canvas").get(0);
    this.buffercanvas = $("#buffer-canvas").get(0);
    this.maskcanvas = $("#mask-canvas").get(0);

    this.videocanvas.width = this.cwidth;
    this.videocanvas.height = this.cheight;
    this.drawcanvas.width = this.cwidth;
    this.drawcanvas.height = this.cheight;
    this.buffercanvas.width = this.cwidth;
    this.buffercanvas.height = this.cheight;
    this.maskcanvas.width = this.cwidth;
    this.maskcanvas.height = this.cheight;

    this.videoctx = this.videocanvas.getContext("2d");
    this.drawctx = this.drawcanvas.getContext("2d");
    this.bufferctx = this.buffercanvas.getContext("2d");
    this.maskctx = this.maskcanvas.getContext("2d");
  	//this.drawctx.globalCompositeOperation = "lighter";

  	this.setPlayer(vc_setting.urls[15]);

    var cammeraStream = null;
    var timeout = 1000 / 30;
    var isCapturing = false;

    this.initBind();
    this.initLeap();

    $("#mode-button").click();
    
    //ブラウザ間で仕様が違うらしいオブジェクト
    var windowURL = window.URL || window.webkitURL;
    //別名を作れないので上書きしておく
    navigator.getUserMedia = navigator.getUserMedia ||
               				 navigator.webkitGetUserMedia ||
               				 navigator.mozGetUserMedia ||
               				 navigator.msGetUserMedia;
    
    //取れなかったら動作しない
    if (windowURL == null || navigator.getUserMedia == null) {
    	alert("このブラウザじゃ動かないよ");
        return;
    }
    
    
    //定周期で、videoをcanvasにキャプチャし、
    //さらにcanvasをimgに変換する(これで送信可能なキャプチャデータになってるはず)
    var capture = function() {
        if (isCapturing == false) return;
    	//context.transform(1, 0, 0, -1, 0, 1280);
    	self.videoctx.save();
		self.videoctx.scale(-1, 1);
		var ratio = self.height / self.width;
		var offset = (self.cheight - self.cwidth * ratio) / 2;
        self.videoctx.drawImage(video, 
        	0, offset, self.cwidth, self.cheight - 2 * offset,
        	0, 0, -self.cwidth, self.cheight);
		self.videoctx.scale(-1, 1);
        self.videoctx.globalCompositeOperation = 'destination-out';
        var offsetX = self.cwidth / 2 * (1 - 1 / self.maskZoom);
        var offsetY = self.cheight / 2 * (1 - 1 / self.maskZoom);
        //self.videoctx.drawImage(self.maskcanvas, 0,0);
        self.videoctx.drawImage(self.maskcanvas, 
        	offsetX, offsetY, self.cwidth / self.maskZoom, self.cheight / self.maskZoom,
        	0, 0, self.cwidth, self.cheight);
        self.videoctx.restore();

        if (self.startZoom){
        	self.maskZoom *= 1.04;
        	if (self.maskZoom > 40) {
        		console.log("zoomend");
				$("#returntext").fadeIn(300);
        		self.maskZoom = 40;
        		self.startZoom = false;
        		self.zoomEnd = true;
        	}
        }
        setTimeout(capture, timeout);
    };

    //成功したときのコールバック
    var success = function(stream) {
        $video.attr("src", windowURL.createObjectURL(stream));
        cammeraStream = stream;
        //キャプチャも開始する
        isCapturing = true;
        capture();
    };
    
    //失敗したときのコールバック
    var error = function(e) {
    	alert("失敗");
    };
    
    //音も取れるらしいけど今回は動画のみ
    //getUserMediaの第一引数の型が途中で仕様変更されたらしい
    navigator.getUserMedia({video: true}, success, error);
}

ViewController.prototype.initBind = function(){
	var self = this;
	// $("#draw-canvas").mousemove(function(e){

	// 	self.drawctx.fillStyle = "rgb(0, 255, 255)";
	// 	self.drawctx.fillRect(e.clientX / self.width * self.cwidth - 5,e.clientY / self.height * self.cheight - 5,10,10);
	// });

	$("button.carib-set-button").click(function(){
		var num = Number($(this).attr("name"));
		self.caribValue[num] = self.pos;
		var rateX = self.cwidth * 0.8 / (self.caribValue[1][0] - self.caribValue[0][0]);
		var rateY = self.cheight * 0.8 / (self.caribValue[0][1] - self.caribValue[1][1]);
		console.log(rateX+"/"+rateY);
		self.caribValue[2].rateX = rateX;
		self.caribValue[2].rateY = rateY;
		console.log(self.caribValue);
	});

	$("#start-button").click(function(){

		self.isStart = !self.isStart;
		if (self.isStart){
			$(this).text("stop");
		}else{
			$(this).text("start");
		}
	});

	$("#mode-button").click(function(){
		self.mode++;
		if (self.mode > 2) self.mode = 0;
		if (self.mode == 0){
			self.maskctx.strokeStyle = "rgb(0, 0, 0)";
			self.maskctx.fillStyle = "rgb(0, 0, 0)";
    		self.maskctx.lineCap = "square";
			self.maskctx.lineWidth = vc_setting.strokeWidth;
			$(this).text("mode 0");
			$("#text").html("P-kiesタッチ！<br>画面の前で指を動かしてみよう！");
		}else if (self.mode == 1){
			self.maskctx.strokeStyle = "rgb(0, 0, 0)";
			self.maskctx.fillStyle = "rgb(0, 0, 0)";
			self.maskctx.lineWidth = 10;
			$(this).text("mode 1");
			$("#text").html("P-kiesウィンドウ！<br>画面の前で四角を描いてみよう！");
		}else{
			self.maskctx.strokeStyle = "rgb(0, 0, 0)";
			self.maskctx.fillStyle = "rgb(0, 0, 0)";
			self.maskctx.lineWidth = 10;
			self.drawctx.strokeStyle = "rgb(255, 255, 255)";
			self.drawctx.lineCap = "round";
			self.drawctx.lineWidth = 8;
			$(this).text("mode 2");
			$("#text").html("P-kiesウィンドウ！<br>画面の前で四角を描いてみよう！");
		}
	});
	$("#reset-button").click(function(){
		self.maskctx.clearRect(0, 0, self.cwidth, self.cheight);
	});
	$("#all-reset-button").click(function(){
		self.resetView();
	});
	$(window).keydown(function(e){
		console.log(e.keyCode);
		if (e.keyCode == 13){
			$("#mode-button").click();
		}
		if (e.keyCode == 27){
			self.resetView();
		}
		if (e.keyCode == 32){
			$("#ui").toggle();
		}
	});
}
ViewController.prototype.initLeap = function(){
	var self = this;
	Leap.loop({enableGestures: true}, function(frame){
		if (self.startZoom){
			return;
		}
		if (frame.fingers[3]){
			//if (frame.fingers[0].tipPosition[1] < self.caribValue[1][1] * 0.8){
				self.zoomEnd = false;
				self.startZoom = false;
				self.resetView();
			//}
		}
		if (self.mode == 0){
		    self.drawctx.clearRect(0, 0, self.cwidth, self.cheight);
			if (frame.fingers.length == 1){
				var finger = frame.fingers[0];
				var pos = finger.tipPosition;
				var rate = 4;
				//console.log(pos);
				self.updateStat(pos);
				if (pos[2] < 0){
					var x = self.cwidth * 0.1 + (pos[0] - self.caribValue[0][0]) * self.caribValue[2].rateX;
					var y = self.cheight * 0.9 - (pos[1] - self.caribValue[1][1]) * self.caribValue[2].rateY;
					self.drawctx.fillStyle = "rgb(150, 150, 150)";
					self.drawctx.fillRect(
						x - 5,
						y - 5,
						10,10);
					if (self.isStart){
						if (!self.isTap){
							self.isTap = true;
							self.prepos.x = x;
							self.prepos.y = y;
						}
						else{
							self.maskctx.beginPath();
							self.maskctx.moveTo(self.prepos.x, self.prepos.y);
							self.maskctx.lineTo(x,y);
							self.maskctx.stroke();
							self.prepos.x = x;
							self.prepos.y = y;
						}
					}
				}
				else{
					if (self.isStart && self.isTap && !self.startZoom){
						self.isTap = false;
						if (self.zoomEnd){
							// self.zoomEnd = false;
							// self.startZoom = false;
							// self.resetView();
						}
						else{
							var centerData = self.maskctx.getImageData(288,216,64,48);
							for (var i = 0; i < 64 * 48; ++i){
								var data = centerData.data[i * 4 + 3];
								if (data != 255) return;
							}
							self.videoVisible = true;
							console.log("video start");
							ytplayer.playVideo();
							console.log("startzoom");
							$("#text").fadeOut(300);
							setTimeout(function(){self.startZoom = true}, 1000);
						}
					}
				}
			}
		}
		if (self.mode == 1){
		    self.bufferctx.clearRect(0, 0, self.cwidth, self.cheight);
		    self.bufferctx.drawImage(self.drawcanvas, 0, 0);
		    self.drawctx.globalAlpha = 0.98;
		    self.drawctx.clearRect(0, 0, self.cwidth, self.cheight);
		    self.drawctx.drawImage(self.buffercanvas, 0, 0);
			if (frame.fingers.length == 1){
				var finger = frame.fingers[0];
				var pos = finger.tipPosition;
				var rate = 4;
				self.updateStat(pos);
				if (pos[2] < 0){
					var x = self.cwidth * 0.1 + (pos[0] - self.caribValue[0][0]) * self.caribValue[2].rateX;
					var y = self.cheight * 0.9 - (pos[1] - self.caribValue[1][1]) * self.caribValue[2].rateY;
					if (self.isStart){
						if (!self.isTap){
							self.isTap = true;
							self.maskctx.beginPath();
							self.maskctx.moveTo(x,y);
						}
						else{
							self.maskctx.lineTo(x,y);
						}
					}
					self.drawctx.fillStyle = "rgb(255, 150, 150)";
					self.drawctx.beginPath();
					self.drawctx.arc(x, y, 10, 0, 2 * Math.PI, true);
					self.drawctx.fill();
				}
				else{
					if (self.isStart && self.isTap && !self.startZoom){
						self.isTap = false;
						if (self.zoomEnd){
							// self.zoomEnd = false;
							// self.startZoom = false;
							// self.resetView();
						}
						else{
							self.maskctx.closePath();
							self.maskctx.fill();
						    self.bufferctx.clearRect(0, 0, self.cwidth, self.cheight);
						    self.drawctx.clearRect(0, 0, self.cwidth, self.cheight);
							var centerData = self.maskctx.getImageData(288,216,64,48);
							for (var i = 0; i < 64 * 48; ++i){
								var data = centerData.data[i * 4 + 3];
								if (data != 255) return;
							}
						    self.videoVisible = true;
							console.log("video start");
							ytplayer.playVideo();
							console.log("startzoom");
							$("#text").fadeOut(300);
							setTimeout(function(){self.startZoom = true}, 1000);
						}
					}
				}
			}
		}
		if (self.mode == 2){
		    // self.bufferctx.clearRect(0, 0, self.cwidth, self.cheight);
		    // self.bufferctx.drawImage(self.drawcanvas, 0, 0);
		    // self.drawctx.globalAlpha = 0.98;
		    // self.drawctx.clearRect(0, 0, self.cwidth, self.cheight);
		    // self.drawctx.drawImage(self.buffercanvas, 0, 0);
			if (frame.fingers.length == 1){
				var finger = frame.fingers[0];
				var pos = finger.tipPosition;
				var rate = 4;
				//console.log(pos);
				self.updateStat(pos);
				if (pos[2] < 0){
					var x = self.cwidth * 0.1 + (pos[0] - self.caribValue[0][0]) * self.caribValue[2].rateX;
					var y = self.cheight * 0.9 - (pos[1] - self.caribValue[1][1]) * self.caribValue[2].rateY;
					if (self.isStart){
						var newpos = self.getSquarePos(self.sqValue);
						self.drawctx.beginPath();
						self.drawctx.moveTo(self.prenewpos.x, self.prenewpos.y);
						self.drawctx.lineTo(newpos[0],newpos[1]);
						self.drawctx.stroke();
						if (!self.isTap){
							self.isTap = true;
							self.prepos.x = x;
							self.prepos.y = y;
							self.prenewpos.x = newpos[0];
							self.prenewpos.y = newpos[1];
							if (self.sqValue == 0){
								self.maskctx.beginPath();
								self.maskctx.moveTo(newpos[0],newpos[1]);
							}
						}
						else{
							var deltaX = self.prepos.x - x;
							var deltaY = self.prepos.y - y;
							var val = 0;
							switch(newpos[2]){
								case 0:
								case 1:
									val = Math.max(-deltaY, 0);
									break;
								case 2:
									val = Math.max(deltaX, 0);
									break;
								case 3:
									val = Math.max(deltaY, 0);
									break;
								case 4:
									val = Math.max(-deltaX, 0);
									break;
								case 5:
									val = Math.sqrt(Math.pow(deltaX,2) + Math.pow(deltaY,2));
									break;
							}
							val_mini = Math.sqrt(Math.pow(deltaX,2) + Math.pow(deltaY,2));
							self.sqValue += val * 0.8 + val_mini * 0.1;
							self.prepos.x = x;
							self.prepos.y = y;
							self.prenewpos.x = newpos[0];
							self.prenewpos.y = newpos[1];
							self.maskctx.lineTo(newpos[0],newpos[1]);
						}
					}
				}
				else{
					if (self.isStart && self.isTap && !self.startZoom){
						self.isTap = false;
						if (self.zoomEnd){
							// self.zoomEnd = false;
							// self.startZoom = false;
							// self.resetView();
						}
						else{
							if (self.sqValue > 1000){
								self.maskctx.closePath();
								self.maskctx.fill();
							    self.bufferctx.clearRect(0, 0, self.cwidth, self.cheight);
							    self.drawctx.clearRect(0, 0, self.cwidth, self.cheight);
								var centerData = self.maskctx.getImageData(288,216,64,48);
								for (var i = 0; i < 64 * 48; ++i){
									var data = centerData.data[i * 4 + 3];
									if (data != 255) return;
								}
								self.videoVisible = true;
								console.log("video start");
								ytplayer.playVideo();
								console.log("startzoom");
								$("#text").fadeOut(300);
								setTimeout(function(){self.startZoom = true}, 1000);
							}
						}
					}
				}
			}
		}
	});
}

ViewController.prototype.updateStat = function(_pos){
	$("#carib-stat").text(_pos[0].toFixed(1)+" / "+_pos[1].toFixed(1)+" / "+_pos[2].toFixed(1));
	this.pos = _pos;
	var maxsize = 60;
	if (_pos[2] > maxsize){
		$("#stat-circle").hide();
	}
	else if (_pos[2] > 0){
		var size = maxsize - _pos[2];
		$("#stat-circle")
			.show()
			.css("background-color","#faa")
			.css("top",120 - size / 2)
			.css("left",this.width / 2 - size / 2)
			.css("width",size)
			.css("height",size);
	}
	else{
		$("#stat-circle")
			.css("background-color","#afa")
			.css("top",120 - maxsize / 2)
			.css("left",this.width / 2 - maxsize / 2)
			.css("width",maxsize)
			.css("height",maxsize);
	}
}
ViewController.prototype.resetView = function(){
	var id = Math.floor(Math.random() * vc_setting.urls.length);
	this.maskZoom = 1;
	this.startZoom = false;
	this.zoomEnd = false;
	this.videoVisible = false;
	this.sqValue = 0;
	this.maskctx.clearRect(0, 0, this.cwidth, this.cheight);
	this.setVideoId(vc_setting.urls[id]);
	$("#text").fadeIn(300);
	$("#returntext").fadeOut(300);
}
ViewController.prototype.pausePlayer = function(_id){
	console.log("pause" + this.videoVisible);
	if (!this.videoVisible) ytplayer.pauseVideo();
}

ViewController.prototype.setPlayer = function(_id){
    var params = { allowScriptAccess: "always" };
    var atts = { id: "myytplayer" };
    var url = "http://www.youtube.com/v/"+ _id +"?enablejsapi=1&playerapiid=ytplayer&loop=1&showinfo=0&theme=dark&autohide=1";
    swfobject.embedSWF(url, "myplayer", this.width, this.height, "8", null, null, params, atts); 

}
ViewController.prototype.setVideoId = function(_id){
	ytplayer.loadVideoById(_id);
}
ViewController.prototype.getSquarePos = function(_val){
	var rate = 5;
	var x = this.cwidth / 2 + this.cwidth / rate;
	var y = this.cheight / 2 - this.cheight / rate;
	var phase = 0;
	if (_val > 0){
		y += (_val >= 200 ? 200 : _val) / 200 * (this.cheight / rate * 2);
		phase = 1;
	}
	if (_val > 200){
		x -= (_val >= 500 ? 300 : _val - 200) / 300 * (this.cwidth / rate * 2);
		phase = 2;
	}
	if (_val > 500){
		y -= (_val >= 700 ? 200 : _val - 500) / 200 * (this.cheight / rate * 2);
		phase = 3;
	}
	if (_val > 700){
		x += (_val >= 1000 ? 300 : _val - 700) / 300 * (this.cwidth / rate * 2);
		phase = 4;
	}
	x += Math.random() * 4 - 2;
	y += Math.random() * 4 - 2;
	return [x,y,phase];
}