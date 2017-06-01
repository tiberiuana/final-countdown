// 
// Common  
//

/***
 * Raises window notification
 * @param body
 * @param title
 * @param icon
 */
function notify(body, title, icon) {
  var options = {
    body: body,
    icon: icon,
  }
  var n = new Notification(title, options);
}


/***
 * Converts from seconds to human string
 * @param seconds
 */
function humanizeSeconds(seconds) {
  if (seconds != 0 && !seconds) {
    return "?"
  }
  var d = new Date(null)
  d.setSeconds(seconds)
  var label = d.toISOString()
  if (seconds > 60 * 60) {
    label = label.substr(11, 8)
  } else {
    label = label.substr(14, 5)
  }
  return label
}


// Constants
APP_TITLE = 'Final Countdown'


//
// Timer Card
//
var TimerCard = Vue.component('timer-card', {
  template: '#timerCardTemplate',
  props: {
    fortune: String,
    remainingSeconds: Number,
    sessionMinutes: String,
    settings: Object,
  },
  computed: {
    isTimerRunning: function () {
      return !!this.remainingSeconds
    },
  },

  methods: {
    showAbout: function () {
      this.$emit('show-about')
    },
    showSettings: function () {
      this.$emit('show-settings')
    },
    startTimer: function () {
      this.$emit('start-timer')
    },
    restartTimer: function () {
      this.$emit('restart-timer')
    },
    startShortBreak: function () {
      this.$emit('start-short-break')
    },
    startLongBreak: function () {
      this.$emit('start-long-break')
    },
    stopTimer: function () {
      this.$emit('stop-timer')
    }
  },
  filters: {
    // TODO Put in mixin
    humanizeSeconds: humanizeSeconds,
  },
  mounted: function () {
    componentHandler.upgradeDom()
  }
})


/**
 * Settings card
 */
var SettingsCard = Vue.component('settings-card', {
  template: '#settingsCardTemplate',

  model: {
    prop: 'settings',
    event: 'change'
  },

  props: {
    settings: Object,
    num: String,
  },

  computed: {
    localSettings: {
      get: function () {
        return this.settings
      },
      set: function (object) {
        this.$emit('change', object)
      },
    },
  },

  methods: {

    goBack: function () {
      this.$emit('back')
    },

  },

  // mounted: function () {
  //   componentHandler.upgradeDom()
  // }
})


var routes = {
  '/': TimerCard,
  '/settings': SettingsCard,
  // '/about': AboutCard,
}

/**
 * App
 */
var vue = new Vue({
  el: '#app',

  //
  // Data
  //

  data: function () {
    data = {
      activeView: 'timer',  // timer, settings

      fortunes: [
        "Never look up when dragons fly overhead.",
        "You definitely intend to start living sometime soon.",
        "Your business will assume vast proportions.",
      ],
      defaultSettings: {
        sessionMinutes: '25',
        shortBreakMinutes: '5',
        longBreakMinutes: '15',
        isEndSoundOn: true,
        isTickSoundOn: false,
      },
      liveSession: null,  // { startDate, minutes }

      minuteTimerId: null,  // 1m timer, if we have one running
      secondTimerId: null,  // 1s timer, if we have one running

      canNotify: null,

      now: new Date(),
      remainingSeconds: null,
    }
    data.settings = Object.assign({}, data.defaultSettings)
    return data
  },

  computed: {
    randomFortune: function () {
      var randomIndex = Math.floor(Math.random() * this.fortunes.length)
      return this.fortunes[randomIndex]
    },
  },

  //
  //
  //

  methods: {
    exitSettings: function () {
      this.activeView = 'timer'
    },

    minuteTick: function () {
    },

    resetSettings: function () {
      this.settings = Object.assign({}, this.defaultSettings)
    },

    updateSettings: function (newSettings) {
      console.log(newSettings)
    },

    secondTick: function () {
      // remaining sessions
      var now = new Date()
      this.now = now

      var diff = (now - this.liveSession.startDate) / 1000  // seconds
      var remaining = Math.max((this.liveSession.minutes * 60) - diff, 0)
      this.remainingSeconds = remaining
      document.title = humanizeSeconds(this.remainingSeconds) + ' - ' + APP_TITLE
      if (remaining == 0) {
        this.timerFinished()
      }
    },

    /***
     * Asks for permission to send notifications
     */
    setUpNotifications: function () {
      // Not all browsers support notifications
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          this.canNotify = true
        }
        else if (Notification.permission !== 'denied') {
          // Ask for permission to notify
          Notification.requestPermission(function (permission) {
            console.log('permission', permission)
            if (permission === 'granted') {
              this.canNotify = true
            }
          }.bind(this));
        }
      }
    },

    // TODO Implement
    // showAbout: function() {
    //   this.activeView = 'about'
    // },

    /***
     * Switches to settings page
     */
    showSettings: function () {
      this.activeView = 'settings'
    },

    showTimer: function () {
      this.activeView = 'timer'
    },

    startTimer: function (durationInMinutes) {
      if (this.canNotify == null) {
        this.setUpNotifications()
      }
      var minutes = durationInMinutes || this.settings.sessionMinutes

      this.liveSession = {
        startDate: new Date(),
        minutes: minutes,
      }
      // TODO Save session in local storage
      // this.localStorage.setItem('liveSession', JSON.stringify(this.liveSession))
      this.secondTimerId = setInterval(function () {
        this.secondTick()
      }.bind(this), 1000)
      this.secondTick()

      if (this.settings.isTickSoundOn) {
        this.tickHowl = new Howl({
          src: ['tick.mp3'],
          loop: true,
        })
        this.tickHowl.play()
      }
    },

    timerFinished: function () {
      this.stopTimer()
      notify("Your timer has ended.", "Time is up!")
      if (this.settings.isEndSoundOn) {
        var sound = new Howl({
          src: ['bell1.mp3'],
        })
        sound.play()
      }
    },

    stopTimer: function () {
      clearInterval(this.secondTimerId)
      this.secondTimerId = null
      this.remainingSeconds = null
      this.liveSession = null
      document.title = APP_TITLE
      if (this.tickHowl) {
        this.tickHowl.stop()
      }
    },

    startShortBreak: function () {
      this.startTimer(this.settings.shortBreakMinutes)
    },

    startLongBreak: function () {
      this.startTimer(this.settings.longBreakMinutes)
    },

    updateSettings: function (newSettings) {
      // TODO Implement
      console.log('update settings ---', newSettings)
    },

  },

  //
  //
  //

  filters: {},

  //
  // Lifecycle
  //


  beforeCreate: function () {
    // TODO
    // // Load live session from localStorage
    this.minuteTimerId = window.setInterval(function () {
      this.minuteTick()
    }.bind(this), 60000)
    // TODO
    // Load session
    // this.liveSession = JSON.parse(localStorage.getItem('liveSession'))
  },

  mounted: function () {

  }
})