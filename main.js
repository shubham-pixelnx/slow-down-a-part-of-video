const qs = (s, p = document) => p.querySelector(s);
const qsa = (s, p = document) => p.querySelectorAll(s);

class SlowMotionEditor {
	constructor(options) {
		this.elements = options.elements;
		this.classes = options.classes;
		this.state = {
			speed: 1,
			filter: "none",
			leaderLine: null,
			modifications: {
				start: 70,
				end: 95,
			},
		};
		this.init();
	}
	init = () => {
		/* this.elements.targetVideo.addEventListener("contextmenu", (e) => e.preventDefault()); */
		let { targetVideo, playBtn, seeker, speedControls, filterControls, modifications, modifiedPart, mdfStart, mdfEnd } = this.elements;
		this.state.leaderLine = new LeaderLine(modifiedPart, modifications, {
			color: "rgba(255,255,255,0.6)",
			size: 2,
			startSocket: "bottom",
			endSocket: "top",
		});
		this.player.update();
		targetVideo.addEventListener("play", (e) => {
			this.player.play();
		});
		targetVideo.addEventListener("pause", (e) => {
			this.player.pause();
		});

		playBtn.addEventListener("click", (e) => {
			if (this.player.isPlaying()) {
				this.player.pause();
			} else {
				this.player.play();
			}
		});

		seeker.addEventListener("mousedown", (e) => {
			this.player.pause();
			document.addEventListener("mousemove", this.seeker.mousemove);
			document.addEventListener("mouseup", this.seeker.mouseup);

			document.body.style.cursor = "e-resize";
		});

		[modifiedPart, mdfStart, mdfEnd].forEach((el) => {
			el.addEventListener("mousedown", (e) => {
				this.modifiedSeeker.targetHandle = el;
				document.addEventListener("mousemove", this.modifiedSeeker.mousemove);
				document.addEventListener("mouseup", this.modifiedSeeker.mouseup);

				document.body.style.cursor = "move";
			});
		});

		speedControls.forEach((el) => {
			el.onchange = () => {
				this.state.speed = +el.value;
				this.player.update();
			};
		});
		filterControls.forEach((el) => {
			el.onchange = () => {
				this.state.filter = el.value;
				this.player.update();
			};
		});
	};
	seeker = {
		mousemove: (e) => {
			let { width: fillWrapperWidth } = this.elements.progressFillWrapper.getBoundingClientRect();
			let percentageMovement = (e.movementX / fillWrapperWidth) * 100;

			let { duration, currentTime: newCurrentTime } = this.elements.targetVideo;
			let addition = (duration * percentageMovement) / 100;

			newCurrentTime += addition;
			if (newCurrentTime > duration) {
				newCurrentTime = duration;
			} else if (newCurrentTime < 0) {
				newCurrentTime = 0;
			}

			this.elements.targetVideo.currentTime = newCurrentTime;
			this.player.update();
		},
		mouseup: (e) => {
			document.removeEventListener("mousemove", this.seeker.mousemove);
			document.removeEventListener("mouseup", this.seeker.mouseup);
			document.body.style.cursor = "";
		},
	};
	modifiedSeeker = {
		targetHandle: null,
		mousemove: (e) => {
			let { width: fillWrapperWidth } = this.elements.progressFillWrapper.getBoundingClientRect();
			let percentageMovement = (e.movementX / fillWrapperWidth) * 100;

			let { move } = this.modifiedSeeker.targetHandle.dataset; // both || start || end
			let { start: newStart, end: newEnd } = this.state.modifications;
			if (["both", "start"].includes(move)) {
				newStart += percentageMovement;
				if (newStart < 0) {
					this.player.update();
					return;
				}
			}
			if (["both", "end"].includes(move)) {
				newEnd += percentageMovement;
				if (newEnd > 100) {
					this.player.update();
					return;
				}
			}
			if (newEnd - newStart < 5) {
				this.player.update();
				return;
			}
			this.state.modifications.start = newStart;
			this.state.modifications.end = newEnd;
			this.player.update();
		},
		mouseup: (e) => {
			document.removeEventListener("mousemove", this.modifiedSeeker.mousemove);
			document.removeEventListener("mouseup", this.modifiedSeeker.mouseup);
			document.body.style.cursor = "";
		},
	};
	player = {
		playingInterval: null,
		isPlaying: () => {
			return !this.elements.targetVideo.paused;
		},
		play: () => {
			console.log("play");
			this.elements.playBtn.classList.add(this.classes.playing);
			if (!this.player.isPlaying()) {
				this.elements.targetVideo.play();
			}
			if (this.player.playingInterval) {
				window.clearInterval(this.player.playingInterval);
			}
			this.player.playingInterval = setInterval(() => {
				this.player.update();
			}, 1000 / 60);
		},
		pause: () => {
			console.log("paus", this.player.playingInterval);
			this.elements.playBtn.classList.remove(this.classes.playing);
			if (this.player.isPlaying()) {
				this.elements.targetVideo.pause();
			}
			window.clearInterval(this.player.playingInterval);
		},
		update: () => {
			// Set timestamps
			let { targetVideo, durationStats, progressFill, seeker, modifiedPart, mdfStart, mdfEnd } = this.elements;
			let { currentTime, duration } = targetVideo;
			durationStats.innerText = `${currentTime.toFixed(1)}/${duration.toFixed(1)}s`;

			// Set Progress Bar
			let percentage = (currentTime / duration) * 100;
			progressFill.style.width = `${percentage}%`;
			seeker.style.left = `${percentage}%`;

			// Update the modified part
			modifiedPart.style.left = mdfStart.style.left = `${this.state.modifications.start}%`;
			modifiedPart.style.width = `${this.state.modifications.end - this.state.modifications.start}%`;
			mdfEnd.style.left = `${this.state.modifications.end}%`;

			// Update LeaderLine pointing towards controls
			if (this.state.leaderLine) {
				this.state.leaderLine.position();
			}

			// Set filters
			(() => {
				let percentagePlayed = (currentTime / duration) * 100;
				if (percentagePlayed >= this.state.modifications.start && percentagePlayed <= this.state.modifications.end) {
					if (targetVideo.style.filter !== this.state.filter) {
						targetVideo.style.filter = this.state.filter;
					}
					if (targetVideo.playbackRate !== this.state.speed) {
						targetVideo.playbackRate = this.state.speed;
					}
				} else {
					if (targetVideo.style.filter !== "none") {
						targetVideo.style.filter = "none";
					}
					if (targetVideo.playbackRate !== 1) {
						targetVideo.playbackRate = 1;
					}
				}
			})();
		},
	};
}
document.addEventListener("DOMContentLoaded", () => {
	const targetVideo = qs("#targetVideo");
	let options = {
		elements: {
			targetVideo: targetVideo,
			speedControls: qsa(`[name="speed"]`),
			filterControls: qsa(`[name="filter"]`),
			playBtn: qs(".playBtn"),
			durationStats: qs("#durationStats"),
			progressFillWrapper: qs(".progressFillWrapper"),
			progressFill: qs(".progressFill"),
			seeker: qs(".seeker"),
			modifiedPart: qs(".modifiedPart"),
			modifications: qs(".modifications"),
			mdfStart: qs(".mdfStart"),
			mdfEnd: qs(".mdfEnd"),
		},
		classes: {
			playing: "playing",
		},
	};

	targetVideo.addEventListener("loadedmetadata", (e) => {
		let smEditor = new SlowMotionEditor(options);
		console.log((window.instance = smEditor));
	});
});
