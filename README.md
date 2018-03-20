# ConcourseCI Radiator

**Radiator** - is a simple page that shows pipeline job statuses in one place. It suits to be displayed on a TV screen to give an overview of your [ConcourseCI](http://concourse.ci) builds. The Radiator front-end polls the Concourse every 30 seconds for an updates and shows the actual information.

![ConcourseCI Radiator](https://github.com/moodev/concourseci-radiator/blob/master/public/images/Selection_034.jpg)

or, this is how it looks like on the TV wall:

![ConcourseCI Radiator on TV wall](https://github.com/moodev/concourseci-radiator/blob/master/public/images/concourse-radiator-on-wall.jpg)

The back-end is an utterly simple proxy server written in [Node.js](https://nodejs.org/en/) and the front-end is made using the [ReactJS framework](http://reactjs.net).

To run this service, you need to install `npm` dependencies:

```bash
npm install
```
edit the file `config.json` providing correct URL and credentials for your Concourse server and then you can start it:

```bash
node app.js >> /var/log/ci-monitor/log.txt &
```

Now you can navigate to your browser at http://localhost:3001 and you will see the Radiator for your ConcourseCI.

Enjoy!
