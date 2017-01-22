(function () {
	function Lock(config) {
		var self = this;
		this.callback = config.callback || function () {};
		this.state = config.state || "set";//  状态。默认 set设置密码，reset重置密码，check校验（成功，失败）,login（前端登录测试用）。
		this.color = function () {  //不同状态的颜色
			return self.result ? config.color.success||'#3385ff' : config.color.fail||'#ff5722'
		};
		this.canvasId = config.canvasId;
		this.context = wx.createCanvasContext(this.canvasId);
		this.context.setGlobalAlpha(0.8);
		this.result = true;
		this.circleList = []; //9个点集合
		this.crossCircleList = [];//  被触发的圆集合
		this.touchFlag = false;    // 是否触摸点在 圆内
		this.opt = {
			outCircle: {
				radius: 25
			},
			innerCircle: {
				radius: 7
			},
			cavSize: {
				H: 300,
				W: 300
			}
		}
	}
	Lock.prototype.init = function () {
		this.createCircle(this.opt.outCircle.radius);//先画9个大圆。
		wx.drawCanvas({
			canvasId: this.canvasId,
			actions: this.context.getActions(),
			reserve: true
		});
	}
	Lock.prototype.drawCircle = function (obj, radius, solid) {
		var self = this;
		if (!solid) {
			this.context.setStrokeStyle(self.color());
			this.context.setLineWidth(1);
			this.context.beginPath();
			this.context.arc(obj.x, obj.y, radius, 0, Math.PI * 2, true);
			this.context.closePath();
			this.context.stroke();
		} else {
			this.context.setFillStyle(self.color());
			this.context.setLineWidth(1);
			this.context.beginPath();
			this.context.arc(obj.x, obj.y, radius, 0, Math.PI * 2, true);
			this.context.closePath();
			this.context.stroke();
			this.context.fill();
		}
	}
	Lock.prototype.createCircle = function (radius) {
		var n = 3;
		var self = this;
		var r = self.opt.cavSize.W /(2 + 4 * n);
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				let obj = {
					x: j * 4 * r + 3 * r,
					y: i * 4 * r + 3 * r,
					index: self.circleList.length,
					choose: false,
					radius: radius,
					color: self.color()
				};
				if(self.circleList.length < 9){
					self.circleList.push(obj);
				}
			}
		}
		for (let i = 0; i < n * n; i++) {
			self.drawCircle(self.circleList[i], self.opt.outCircle.radius);
		}
	}
	Lock.prototype.drawConLine = function (start, end) {
		this.context.beginPath();
		this.context.setLineWidth(3);
		this.context.moveTo(start.x, start.y);
		for (var i = 1; i < this.crossCircleList.length; i++) {
			var index = this.circleList[this.crossCircleList[i]]
			this.context.lineTo(index.x, index.y);
		}
		this.context.lineTo(end.x, end.y);
		this.context.stroke();
		this.context.closePath();
	}
	Lock.prototype.resetDraw = function () {
		this.createCircle(this.opt.outCircle.radius);//9个大圆
		for (let i = 0; i < this.crossCircleList.length; i++) {
			var index = this.circleList[this.crossCircleList[i]];
			this.drawCircle(index, this.opt.innerCircle.radius, true);//小实心圆
		}
	}
	Lock.prototype.crossCircleIndex = function (pos) {
		var self = this;
		for (var i = 0; i < self.circleList.length; i++) {
			// 判断手指触摸点是否在圆圈内
			if (Math.abs(pos.x - self.circleList[i].x) < self.circleList[i].radius && Math.abs(pos.y - self.circleList[i].y) < self.circleList[i].radius) {
				self.touchFlag = true;
				self.crossCircleList.push(i);
				break;
			}
		}
		self.crossCircleList = Array.from(new Set(self.crossCircleList));//数组去重
	}
	Lock.prototype.bindStart = function (event) {
		var self = this;
		if (event.touches.length == 1) {
			self.crossCircleIndex(event.touches[0])
		}
	}
	Lock.prototype.bindMove = function (event) {
		if (event.touches.length == 1) {
			var self = this;
			if (self.touchFlag) {
				self.crossCircleIndex(event.touches[0])//录入点坐标
				var start = self.circleList[self.crossCircleList[0]];
				self.resetDraw(event)
				self.drawConLine(start, event.touches[0]);//画移动的线
				wx.drawCanvas({
					canvasId: self.canvasId,
					actions: self.context.getActions()
				});
			}
		}
	}
	Lock.prototype.bindEnd = function () {
		var self = this;
		if (self.touchFlag) {
			self.resetDraw();
			if (self.crossCircleList.length <= 4 && this.state != "check") {
				var sendObj = {
					tips: "输入的密码过短,请重新输入"
				};
				self.result = false;
				self.callback.call(this, sendObj);
			} else {
				self.doState(self.state)
			}
			self.failColor();
			setTimeout(function () {
				self.clear();
			}, 300)
		}
	}
	Lock.prototype.failColor = function () {   //最后校验成功失败变色
		var self = this;
		var start = self.circleList[self.crossCircleList[0]];
		var end = self.circleList[self.crossCircleList[self.crossCircleList.length - 1]];
		self.resetDraw();
		self.drawConLine(start, end);//画线
		wx.drawCanvas({
			canvasId: self.canvasId,
			actions: self.context.getActions()
		});
	}
	Lock.prototype.clear = function () {
		var self = this;
		self.circleList = [];
		self.crossCircleList = [];
		self.result = true;
		self.touchFlag = false;
		self.createCircle(self.opt.outCircle.radius);
		wx.drawCanvas({
			canvasId: self.canvasId,
			actions: self.context.getActions()
		});
	}
	Lock.prototype.doState = function (state) {
		var self = this;
		var obj = {
			set: function () {
				wx.setStorageSync('cachePwd', self.crossCircleList);
				self.state = "check";
				var sendObj = {
					pwd: self.crossCircleList,
					tips: "请再次输入密码"
				};
				self.callback.call(this, sendObj);
			},
			reset: function () {
				wx.removeStorageSync('cachePwd');
				self.state = "set";
			},
			check: function () {
				var first = wx.getStorageSync('cachePwd'),
					second = self.crossCircleList.join(""),
					sendObj = {
						pwd: self.crossCircleList,
						tips: ""
					};
				first = first.join("");
				if (first === second) {
					sendObj.tips = "设置密码成功";
					self.callback.call(this, sendObj);
				} else {
					sendObj.tips = "两次密码不一致";
					self.result = false;
					self.callback.call(this, sendObj);
					//wx.removeStorageSync('cachePwd');    //校验过后remove掉
				}
			},
			login: function () {   //前端测试登陆
				var first = wx.getStorageSync('cachePwd'),
					second = self.crossCircleList.join(""),
					sendObj = {
						pwd: self.crossCircleList,
						tips: ""
					};
				first = first.join("");
				if (first === second) {
					sendObj.tips = "验证成功";
					self.callback.call(this, sendObj);
				} else {
					sendObj.tips = "密码错误";
					self.result = false;
					self.callback.call(this, sendObj);
					//wx.removeStorageSync('cachePwd');    //校验过后remove掉
				}
			}
		}
		obj[state]();
	}
	module.exports = {
		lock: Lock
	}
})();