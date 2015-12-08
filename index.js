module.exports = init

var Emitter = require('events').EventEmitter
  , findWhere = require('lodash.findwhere')
  , Primus = require('primus')
  , PrimusEmitter = require('primus-emitter')
  , Socket = Primus.createSocket({ transformer: 'websockets', parser: 'JSON', plugin: { emitter: PrimusEmitter } })

function init(callback) {
  callback(null, 'airproxy', AirProxy)
}

function AirProxy(automait, logger, config) {
  Emitter.call(this)
  this.automait = automait
  this.logger = logger
  this.airProxyClient = new Socket(config.host)
  this.groupData = null

  this.airProxyClient.on('groups', function (groups) {
    var groupData = groups[0]
    this.emitEvents(groupData)
    this.groupData = groupData
  }.bind(this))
}

AirProxy.prototype = Object.create(Emitter.prototype)

AirProxy.prototype.emitEvents = function (newGroupData) {
  if (this.groupData && this.groupData.nowPlaying && !newGroupData.nowPlaying) {
    this.emit('stopping')
  } else if (this.groupData && !this.groupData.nowPlaying && newGroupData.nowPlaying) {
    this.emit('playing')
  }
}

AirProxy.prototype.isPlaying = function (callback) {
  var isPlaying = this.groupData.nowPlaying === null ? false : true
  callback(null, isPlaying)
}

AirProxy.prototype.isOn = function (deviceName, callback) {
  var device = findWhere(this.groupData.zones, { name: deviceName })
  if (!device) return callback(new Error('No device found:' + deviceName))
  callback(null, device.enabled)
}

AirProxy.prototype.getVolume = function (deviceName, volume, callback) {
  var device = findWhere(this.groupData.zones, { name: deviceName })
  if (!device) return callback(new Error('No device found:' + deviceName))
  callback(null, device.volume)
}

AirProxy.prototype.setVolume = function (deviceNames, volume, callback) {
  callback()
}

AirProxy.prototype.increaseVolume = function (deviceNames, upAmount, callback) {
  deviceNames.forEach(function (deviceName) {
    var device = findWhere(this.groupData.zones, { name: deviceName })
    if (!device) return

    var newVolume = device.volume + upAmount
      , data = { volume: newVolume, name: deviceName }

    device.volume = newVolume
    this.airProxyClient.send('zoneVolumeChange', data)
  }.bind(this))
  callback()
}

AirProxy.prototype.decreaseVolume = function (deviceNames, downAmount, callback) {
  deviceNames.forEach(function (deviceName) {
    var device = findWhere(this.groupData.zones, { name: deviceName })
    if (!device) return

    var newVolume = device.volume - downAmount
      , data = { volume: newVolume, name: deviceName }

    device.volume = newVolume
    this.airProxyClient.send('zoneVolumeChange', data)
  }.bind(this))
  callback()
}

AirProxy.prototype.setState = function (deviceNames, onOffState, callback) {
  deviceNames.forEach(function (deviceName) {
    var device = findWhere(this.groupData.zones, { name: deviceName })
    if (!device) return

    var data = { enabled: onOffState, groupName: this.groupData.name, zoneName: deviceName }

    device.enabled = onOffState
    this.airProxyClient.send('zoneStateChange', data)
  }.bind(this))
  callback()
}
