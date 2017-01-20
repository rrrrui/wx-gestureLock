//index.js

var Lock = require('./lock.js').lock;

//获取应用实例
var app = getApp()
Page({
	data: {
		userInfo: {},
		tips: ""
	},
	//事件处理函数
	bindViewTap: function () {
		wx.navigateTo({
			url: '../logs/logs'
		})
	},
	resetPwd: function () {
		this.lock.state = "set";
		wx.removeStorageSync('cachePwd');
		this.setData({
			tips: "请重新输入密码"
		});
	},
	setPwd: function () {
		this.lock.state = "set";
		this.setData({
			tips: "请输入密码"
		});
	},
	checkPwd: function () {
		if (wx.getStorageSync('cachePwd')) {
			this.lock.state = "login";
			this.setData({
				tips: "请输入密码"
			});
		} else {
			this.setData({
				tips: "请先设置密码"
			})
		}
	},
	remind: function () {
		if (wx.getStorageSync('cachePwd')) {
			this.setData({
				tips: "您的密码是：" + wx.getStorageSync('cachePwd').join("")
			})
		} else {
			this.setData({
				tips: "请先设置密码"
			})
		}
	},
	onLoad: function () {
		var self = this;
		var config = {
			state: "set",
			callback: function (data) {
				self.setData({
					tips: data.tips
				});
			},
			color: {
				success: '#3385ff',
				fail: '#ff5722'
			},
			canvasId : "lock"
		};
		this.lock = new Lock(config);
		this.lock.init();
	},
	onTouchStart: function (e) {
		this.lock.bindStart(e);
	},
	onTouchMove: function (e) {
		this.lock.bindMove(e);
	},
	onTouchEnd: function (e) {
		this.lock.bindEnd(e);
	}
})
