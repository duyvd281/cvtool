const mqtt = require('mqtt')
const fs = require('fs')
let PouchDB = require('pouchdb');
const client = mqtt.connect('mqtt://127.0.0.1') // Change it to local broker
const TOPIC = 'channel1' // TOPIC for Hcv2 Edge <=> Homekit
const databasePath = '/mnt/d/cvert/db/db/resource/node-edge-server/edgeDatabase' // replace it by db hcv2 path

//Connect to broker and subscribe
client.on('connect', function() {
  client.subscribe(TOPIC)
})

function checkcmd(msg) {
  if (msg.cmd == 'sync' && msg.source == null) return 1
  else if (msg.cmd == 'status' && msg.objects[0].source == null && msg.source == null) return 2
  else if (msg.cmd == 'set') return 3
  else if (msg.objects[0].data[0].setupCode != null) return 4
  else return -1
}

function gethash(devid) {
  return new Promise((resolve, reject) => {
    const db = new PouchDB(databasePath, {
      adapter: 'leveldb',
      db: require('leveldown')
    });
    db.get('devices', function(err, doc) {
      if (err) {
        reject(err);
      } else {
        let find = doc.devices.find(function(e) {
          return e.devid == devid
        })
        if (find == null) reject('No devid found');
        else resolve(find)
      };
    })
  })
}

//Get message and handle
client.on('message', function(topic, payload) {
  try {
    let msg = JSON.parse(payload)
    switch (checkcmd(msg)) {
      case -1: {
        break
      }
      case 1: {
        console.log('Event: Sync message from Edge')

        //handle for sync message
        msg.source = fs.readFileSync('/sys/class/net/eth0/address', 'utf8').replace(/\n/g, '')
        let message = JSON.stringify(msg)
        console.log('Publish message to Homekit => ' + message)
        client.publish(TOPIC, message)

        break
      }
      case 2: {
        console.log('Event: Status message from Edge')

        //handle for status message

        gethash(msg.objects[0].data[0].devid)
          .then(function(resolve) {
            msg.objects[0].data[0].hash = resolve.hash
            msg.objects[0].data[0].type = resolve.type
            msg.source = fs.readFileSync('/sys/class/net/eth0/address', 'utf8').replace(/\n/g, '') // global.macadrress
            let message = JSON.stringify(msg)
            console.log('Publish message to Homekit => ' + message)
            client.publish(TOPIC, message)
          })
          .catch(error => console.log(error))


        break
      }
      case 3: {
        console.log('Event: Received Set message from Homekit')
        console.log(payload)
        break
      }
      case 4: {
        console.log('Event: Received statusCode message')
        let message = {
          "cmd": "get",
          "reqid": msg.objects[0].reqid,
          "objects": [{
            "type": "msg",
            "data": [{
              "type": "info",
              "content": msg.objects[0].data[0].setupCode
            }]
          }]
        }
        client.publish(TOPIC, JSON.stringify(message))
        break
      }

    }
  } catch (error) {
    console.log(error)
  }
})
