class Heart {
    constructor(selector, options = {}) {
        const defaults = {
            interval: {
                click: 5000,
                move: 10000,
                hold: 5000,
                cleanup: 250,
            },
            heal: 200,
            logsize: {
                click: 20,
                move: 10,
            },
            reset_rightclick: {
                duration: 3000,
            }
        }
        this.options = Object.assign(defaults, options);
        this.heart = document.querySelector(selector);

        this.emojis = null;
        this.emoji_pos = parseInt(this.getCookie('heart-game.pos')) || 0;

        this._addStyles();
        this._addEventListeners();
        this.heart.classList.add('noselect');

        this.eventlog = {
            click: [],
            move: [],
        };

        this.interval = {
            longclick: {
                left: null,
                right: null,
            },
            cleanup: setInterval(() => { this.cleanLog() }, this.options.interval.cleanup),
        }

        if (this.getCookie('heart-game.beaten') == 'true') {
            this.generateEmojis();

            this.setEmoji(this.emojis[this.emoji_pos]);

            this.refreshCookies();
            this.won();
        }
    }

    click_route() {
        switch (this.getEmoji()) {
            case '❤️':
                this.toggleHeartBeat();
                if (this.getClicks() >= 5) this.setEmoji('💔')
                break;
            case '💔':
                if (this.getClicks() >= 20) this.setEmoji('🔥')
                break;
            case '💎':
                if (this.getClicks() >= 60) this.setEmoji('✨')
                break;
            case '✨':
                if (this.getClicks() >= 70) {
                    this.setEmoji('🎉')
                    this.won()
                }
                break;
        }
    }

    move_route() {
        switch (this.getEmoji()) {
            case '💔':
                if (this.getTotalDistance() >= this.options.heal) {
                    this.setEmoji('❤️');
                    this.beat();
                    this.reset_movelog();
                    this.reset_clicklog();
                }
                break;
            case '🔥':
                if (this.getTotalDistance() >= this.options.heal) {
                    this.setEmoji('🖤');
                    this.reset_movelog();
                    this.reset_clicklog();
                }
                break;
        }
    }

    hold_route() {
        switch (this.getEmoji()) {
            case '🖤':

                this.setEmoji('💎');
                this.end()
                break;
        }
    }

    click(ctx) {
        console.log(this.interval, this.eventlog)
        ctx.push_log('click', { time: Date.now() });
        ctx.click_route();

        if (this.isGameBeaten()) {
            this.nextEmoji();
        }
    }

    contextmenu(ctx, event) {
        event.preventDefault();

        if (this.isGameBeaten()) {
            ctx.lastEmoji();

        }
    }

    move(ctx, event) {
        const emoji = ctx.getEmoji()
        const healable = ['💔', '🔥'];

        if (healable.includes(emoji)) {
            ctx.push_log('move', { time: Date.now(), x: event.clientX, y: event.clientY, distance: this.getDistanceToLast(event.clientX, event.clientY) });
            ctx.move_route();
        }
    }

    hold(ctx, event) {
        const emoji = ctx.getEmoji()
        const compressable = ['🖤'];

        if (compressable.includes(emoji)) {
            ctx.interval.longclick.left = setInterval(function () {
                ctx.hold_route();
            }, 5000);
        }

        if (event.which == 3) {
            ctx.interval.longclick.right = setInterval(function () {
                if (confirm('Durch Bestätigung dieses Fensters wird dein Spielfortschritt gelöscht - bist du dir sicher?')) {
                    ctx.deleteCookies();
                    ctx.setEmoji('❤️');
                    ctx.beat();
                }
            }, this.options.reset_rightclick.duration);
        }
    }

    won() {
        if (this.isGameBeaten()) {
            if (this.emojis == null) {
                this.generateEmojis();
                this.setEmoji(this.emojis[this.getCookie('heart-game.pos')] || this.emojis[0]);
                this.end();
            }
            this.setCookie('heart-game.beaten', 'true', 30);

            clearInterval(this.interval.longclick.left);
            clearInterval(this.interval.cleanup);
        }
    }

    isGameBeaten() {
        return this.getCookie('heart-game.beaten') == 'true' || this.getClicks() >= 70;
    }

    end() {
        clearInterval(this.interval.longclick.left);
        clearInterval(this.interval.cleanup);
        this.reset_movelog();
    }

    reset_movelog() {
        this.eventlog.move = [];
    }
    reset_clicklog() {
        this.eventlog.click = [];
    }

    async cleanLog() {
        this.eventlog.click = this.eventlog.click.filter(e => e.time > Date.now() - this.options.interval.click);
        this.eventlog.move = this.eventlog.move.filter(e => e.time > Date.now() - this.options.interval.move);
    }

    push_log(event, data) {
        this.eventlog[event].push(data);
    }

    getClickFrequency(samplesize = false) {
        let clicks = this.eventlog.click.length;
        let from_key = (samplesize ? (clicks - samplesize - 1) : 0);

        let to_key = clicks - 1
        let count = samplesize || clicks;

        if (clicks > 1 && from_key > 1) {
            let time = this.eventlog.click[to_key].time - this.eventlog.click[from_key].time;
            return (count) / (time / 1000)
        }
        return false;
    }

    getClicks() {
        return this.eventlog.click.length;
    }

    getDistanceToLast(x, y) {
        let last = this.eventlog.move[this.eventlog.move.length - 1];
        if (last) {
            return Math.sqrt(Math.pow(last.x - x, 2) + Math.pow(last.y - y, 2));
        }
        return false;
    }

    getTotalDistance() {
        let distance = 0;
        this.eventlog.move.forEach(e => {
            distance += e.distance;
        });
        return distance;
    }

    beat(on = true) {
        this.heart.classList.toggle('heartbeat', on);
    }

    flicker(on = true) {
        this.heart.classList.toggle('fire', on);
    }

    toggleHeartBeat() {
        this.heart.classList.toggle('heartbeat');
    }

    animate() {
        switch (this.getEmoji()) {
            case '🔥':
                this.flicker();
                break;
            default:
                this.beat(false);
                this.flicker(false);
        }
    }

    setEmoji(emoji) {
        this.heart.innerHTML = emoji;
        this.animate();
    }

    getEmoji() {
        return this.heart.innerHTML.trim();
    }

    generateEmojis() {
        let emojRange = [
            ['0x1F40C', '0x1F43D'],
            ['0x1F400', '0x1F42A'],
            ['0x1F44A', '0x1F451'],
            ['0x1F600', '0x1F636'],
            ['0x1F681', '0x1F6A6'],
        ];
        this.emojis = [];
        for (var i = 0; i < emojRange.length; i++) {
            var range = emojRange[i];
            for (var x = parseInt(range[0], 16); x < parseInt(range[1], 16); x++) {
                let emoji = "&#" + x + ";";
                this.emojis.push(emoji);
            }
        }
    }

    nextEmoji() {

        let index = this.emoji_pos || (this.emojis.indexOf(`&#${this.getEmoji().codePointAt(0)};`));

        this.emoji_pos = (index + 1) % this.emojis.length;
        this.setCookie('heart-game.pos', this.emoji_pos, 30);

        this.setEmoji(this.emojis[this.emoji_pos]);

    }

    lastEmoji() {

        let index = this.emoji_pos || (this.emojis.indexOf(`&#${this.getEmoji().codePointAt(0)};`));
        this.emoji_pos = (index - 1) < 0 ? this.emojis.length - 1 : (index - 1);
        this.setCookie('heart-game.pos', this.emoji_pos, 30);


        this.setEmoji(this.emojis[this.emoji_pos]);
    }

    reset() {
        this.beat(false);
        this.flicker(false);
        this.setEmoji('❤️');
    }

    _addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `.noselect {
                -webkit-touch-callout: none;
                /* iOS Safari */
                -webkit-user-select: none;
                /* Safari */
                -khtml-user-select: none;
                /* Konqueror HTML */
                -moz-user-select: none;
                /* Old versions of Firefox */
                -ms-user-select: none;
                /* Internet Explorer/Edge */
                user-select: none;
                /* Non-prefixed version, currently
                supported by Chrome, Edge, Opera and Firefox */
            }

            @keyframes heartbeat {
                0% {transform: scale(.75);}
                20% {transform: scale(1);}
                40% {transform: scale(.75);}
                60% {transform: scale(1);}
                80% {transform: scale(.75);}
                100% {transform: scale(.75);}
            }
            @keyframes fire {
                0% {transform: scaleX(1) scale(1);}
                20% {transform: scaleX(-1) scale(1.1);}
                40% {transform: scaleX(1) scale(1.1);}
                60% {transform: scaleX(-1) scale(1.1);}
                80% {transform: scaleX(1) scale(1.1);}
                100% {transform: scaleX(-1) scale(1.1);}
            }

            .heartbeat {
                width: fit-content;
                height: fit-content;
                animation-name: heartbeat;
                animation-duration: 1s;
                animation-iteration-count: infinite;
                animation-timing-function: ease-in-out;
            }

            .fire {
                width: fit-content;
                height: 29px;
                animation-name: fire;
                animation-duration: 0.5s;
                animation-iteration-count: infinite;
                animation-timing-function: steps(1);
            }`
        document.head.appendChild(style)
    }

    _addEventListeners() {
        this.heart.addEventListener('click', () => { this.click(this) })
        this.heart.addEventListener('contextmenu', (event) => { this.contextmenu(this, event) })

        this.heart.addEventListener('mousemove', (event) => { this.move(this, event) })
        this.heart.addEventListener('mousedown', (event) => { this.hold(this, event) })
        this.heart.addEventListener('mouseup', () => {
            clearInterval(this.interval.longclick.left);
            clearInterval(this.interval.longclick.right);
        })
        this.heart.addEventListener('mouseleave', () => {
            clearInterval(this.interval.longclick.left)
            clearInterval(this.interval.longclick.right)
        })
    }

    refreshCookies() {
        this.setCookie('heart-game.beaten', 'true', 30);
        this.setCookie('heart-game.pos', this.emoji_pos, 30);
    }

    deleteCookies() {
        this.setCookie('heart-game.beaten', 'false', -1);
        this.setCookie('heart-game.pos', 0, -1);
    }

    setCookie(cname, cvalue, exdays) {
        const d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        let expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    getCookie(cname) {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
}
