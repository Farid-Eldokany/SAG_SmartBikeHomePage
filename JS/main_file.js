var newSessionButton = document.getElementById("newsession");
var leaderboardButton = document.getElementById("leaderboard");
var historyButton = document.getElementById("history");
var summary = document.getElementById("summary");
var stats = document.getElementById("stats");
var table = document.getElementById("table");
var start = document.getElementById("start");
var stopp = document.getElementById("stop");
var odometer = document.getElementById("odometer");
var state = {}
state.active = false
var power = 0
var prevSpeed = 0
var speed = 0
var counter = document.getElementById("counter");
var seconds = document.getElementById("seconds");
var main1 = document.getElementById("main1");
var waiting = document.getElementById("waiting");
var hide = document.getElementById("filter-id-71")
var sessionList = []
hide.style.block = "hidden"
var device_id = 2426047;
var device_id2 = 2401442;
var loginPrev = ""
var load = false
var realtime_url = 'https://swagdxb.eu-latest.cumulocity.com/notification/realtime';
var chTab = {}
var activateCounter = {};
chTab.speed = 1500;
activateCounter.flag = false;

var graph;
var powerMeterInterval;

var measurements = {

    'current_speed': 0,
    'max_speed': 0,
    'average_speed': 0,
    'current_power': 0,
    'max_power': 0,
    'total_distance': 0

}

let headers = new Headers();
headers.set('Authorization', 'Basic ZmFyaWQuZWxkb2thbnlAZ21haWwuY29tOkBTQUdmYXJpZDIwMjE=')
headers.set('Content-type', 'application/json')
var wait = setInterval((
    get
), 1000);
var toggle = function(e, b1, b2) {
    var b1 = document.getElementById(b1)
    var b2 = document.getElementById(b2)
    e.className = "selected";
    b1.className = "";
    b2.className = "";

    newSessionButton.style.webkitAnimationPlayState = "running";
    leaderboardButton.style.webkitAnimationPlayState = "running";
    historyButton.style.webkitAnimationPlayState = "running"
    if (load == false) {
        document.getElementById("load").style.visibility = "visible"
        load = true
    }

    if (e.id == "newsession") {
        return newSession()
    }
    if (e.id == "history") {
        return history()
    }
    if (e.id == "leaderboard") {
        return leaderboard()
    }
}

function createChart(){
    google.charts.load('current',{packages:['corechart']});
            google.charts.setOnLoadCallback(drawChart);
            
            function drawChart() {
            // Set Data
            var data = google.visualization.arrayToDataTable(graph);
            // Set Options
            var options = {'width':500,
            'height':500,
            title: 'Speed vs. Time',
            hAxis: {title: 'Time in Seconds'},
            vAxis: {title: 'Speed in km/h'},
            legend: 'none'};
            var chart = new google.visualization.LineChart(document.getElementById('myChart'));
            chart.draw(data, options);}
}
function get() {
    state.active = true
    fetchText()
}

function updateLeaderboard(data) {
    fetch('https://swagdxb.eu-latest.cumulocity.com/inventory/managedObjects/' + device_id.toString(), {
        method: 'PUT',
        body: data,
        mode: "cors",
        headers: headers
    });
}

function checkLogin(data) {
    state.active = false
    var response = JSON.parse(data);
    var login = response["login"];

    if (loginPrev !== login) {

        loginPrev = login
        if (login) {
            console.log(login.toString() + ":" + loginPrev.toString())
            waiting.style.display = "none"
            main1.style.display = "block"
            console.log("here")
        } else {
            waiting.style.display = "block"
            main1.style.display = "none"
        }
    }
}
async function fetchText() {
    if (state.active) {
        let response = await fetch('https://swagdxb.eu-latest.cumulocity.com/inventory/managedObjects/' + device_id.toString(), {
            mode: "cors",
            headers: headers
        });
        var data = await response.text()
        return checkLogin(data)
    }
}

function updatePower() {
    var value = power;
    var animation = new am4core.Animation(hand, {
        property: "value",
        to: value
    }, 200, am4core.ease.cubicOut).start();
}




async function connect() {

    response = await fetch(realtime_url,

        {
            method: 'POST',
            body: JSON.stringify({
                "version": "1.0",
                "minimumVersion": "0.9",
                "channel": "/meta/handshake",
                "supportedConnectionTypes": ["long-polling"]
            }),
            headers: headers




        });
    client = await response.json()
    return client

}



async function subscribe(client_id) {
    response = await fetch(realtime_url,

        {
            method: 'POST',
            body: JSON.stringify({
                "channel": "/meta/subscribe",
                "subscription": "/measurements/" + device_id.toString(),
                "clientId": client_id
            }),
            headers: headers

        });
    subscription = await response.json()
    return subscription
}

async function poll_data(client_id)

{
    response = await fetch(realtime_url,

        {
            method: 'POST',
            body: JSON.stringify({
                "channel": "/meta/connect",
                "connectionType": "smartrest-long-polling",
                "clientId": client_id,
                "advice": {
                    "timeout": 60000,
                    "interval": 10000
                }
            }),
            headers: headers

        });
    telemetry = await response.json();
    return telemetry;

}


function get_data(client_id) {
    if (activateCounter.flag == false) {
        odometer.innerHTML = 0
        speed = 0
        speedStart(0)
        power = 0
        return
    }
    poll_data(client_id).then(telemetry => {


        if (telemetry.length > 1) {
            itervar = 0;
            for (itervar = 0; itervar < telemetry.length - 1; itervar++) {



                type = telemetry[itervar].data.data.type

                if (type == 'SessionTotalDistance')

                {
                    console.log(telemetry[itervar].data.data.SessionTotalDistance.STD.value)
                    odometer.innerHTML = telemetry[itervar].data.data.SessionTotalDistance.STD.value

                }

                if (type == 'SessionSpeed')

                {


                    speed = telemetry[itervar].data.data.SessionSpeed.SS.value
                    speedStart()

                }

                if (type == 'BikePower')

                {
                    power = telemetry[itervar].data.data.BikePower.BP.value



                }


            }
        }

        get_data(client_id)


    });

}

function sendCommand(id, command) {
    fetch('https://swagdxb.eu-latest.cumulocity.com/devicecontrol/operations', {
        method: 'POST',
        mode: "cors",
        body: JSON.stringify({
            "deviceId": id,
            "c8y_Command": {
                "text": command
            }
        }),
        headers: headers
    });
}

function speedStart() {

    $("#dgear").addClass("Drive");
    var spdvalue = speed;

    var initDegree = -120;
    var lastDegree = 120;
    var rotateDeg;
    if (spdvalue <= 48) {
        rotateDeg = initDegree + Math.round(spdvalue / 2) * 5;

    } else if (spdvalue > 48 && spdvalue < 96) {

        rotateDeg = Math.round(spdvalue / 2) * 5 - lastDegree;

    } else {
        alert("Wrong Value")

    }
    console.log(rotateDeg)
    $("#sui").css('-webkit-transform', 'rotate(-120deg)');



    $("#sui").css({
        transition: "transform 3s",
        transform: "rotate(" + rotateDeg + "deg)"
    })
    $("#SUICIRCLE").css({
        transition: "transform 3s",
        transform: "rotate(" + rotateDeg + "deg)"
    })

    setTimeout(function() {
        $("#sui").css({
            transition: "none"
        })
    }, 3000);
    setTimeout(function() {
        $("#SUICIRCLE").css({
            transition: "none"
        })
    }, 3000);



    (function($) {
        $.fn.countTo = function(options) {

            options = $.extend({}, $.fn.countTo.defaults, options || {});


            var loops = Math.ceil(options.speed / options.refreshInterval),
                increment = (options.to - options.from) / loops;

            return $(this).each(function() {
                var _this = this,
                    loopCount = 0,
                    value = options.from,
                    interval = setInterval(updateTimer, options.refreshInterval);

                function updateTimer() {
                    value += increment;
                    loopCount++;
                    $(_this).html(value.toFixed(options.decimals));

                    if (typeof(options.onUpdate) == 'function') {
                        options.onUpdate.call(_this, value);
                    }

                    if (loopCount >= loops) {
                        clearInterval(interval);
                        value = options.to;

                        if (typeof(options.onComplete) == 'function') {
                            options.onComplete.call(_this, value);
                        }
                    }
                }
            });
        };

        $.fn.countTo.defaults = {
            from: 0,
            to: 100,
            speed: 1000,
            refreshInterval: 100,
            decimals: 0,
            onUpdate: null,
            onComplete: null,
        };
    })(jQuery);

    jQuery(function($) {
        $('.speedplus').countTo({
            from: prevSpeed,
            to: speed,
            speed: 150,
            refreshInterval: 1,
            onComplete: function(value) {
                console.debug(this);
            }
        });
    })
    prevSpeed = speed;



};

function setupFlip(tick) {
    tick.value = 15
    Tick.helper.interval(function() {
        if (activateCounter.flag) {
            if (tick.value == 0) {
                stopSession()

            }
            graph.push([tick.value,speed])
            tick.value--;



        } else {
            tick.value = 30

        }
        tick.root.setAttribute('aria-label', tick.value);
    }, 1000);

}



async function getDataa(parse) {
    if (state.active == true) {
        let response = await fetch('https://swagdxb.eu-latest.cumulocity.com/inventory/managedObjects/' + device_id.toString(), {
            mode: "cors",
            headers: headers
        });
        var data = await response.text();
        parse(data);
    }
}

function getSessionData(data) {
    var response = JSON.parse(data);
    var leaderboard = {
        leaderboard: response["leaderboard"]
    };
    var leaderboardKeys = Object.keys(response["leaderboard"][response["contestantEmail"]])
    var mailKeys = ""
    //sendEmail(response["contestantName"],response["contestantEmail"],response["contestantAverageSpeed"],response["contestantMaximumSpeed"],response["contestantCaloriesBurnt"],response["contestantDistanceCovered"])
    if (leaderboardKeys.includes("session_1")) {
        mailKeys = Object.keys(leaderboard["leaderboard"][response["contestantEmail"]])
        leaderboard["leaderboard"][response["contestantEmail"]]["session_" + (mailKeys.length - 5).toString()] = {
            avgspd: response["contestantAverageSpeed"],
            maxspd: response["contestantMaximumSpeed"],
            distcvd: response["contestantDistanceCovered"],
            calbrnt: response["contestantCaloriesBurnt"],
            power: response["contestantCyclingPower"],
            avgpower: response["contestantAverageCyclingPower"],
            image: response["pose_url"],
            KneeFlexion: response["KneeFlexion"],
            KneeExtension: response["KneeExtension"],
            HipExtension: response["KneeFlexion"],
            HipFlexion: response["HipFlexion"],
            ShoulderAngle: response["ShoulderAngle"],
            SpeedGraph:graph
        }
    } else {
        leaderboard["leaderboard"][response["contestantEmail"]]["session_1"] = {
            avgspd: response["contestantAverageSpeed"],
            maxspd: response["contestantMaximumSpeed"],
            distcvd: response["contestantDistanceCovered"],
            calbrnt: response["contestantCaloriesBurnt"],
            power: response["contestantCyclingPower"],
            avgpower: response["contestantAverageCyclingPower"],
            image: response["pose_url"],
            KneeFlexion: response["KneeFlexion"],
            KneeExtension: response["KneeExtension"],
            HipExtension: response["KneeFlexion"],
            HipFlexion: response["HipFlexion"],
            ShoulderAngle: response["ShoulderAngle"],
            SpeedGraph:graph
        }
    }
    updateLeaderboard(JSON.stringify({
        "leaderboard": leaderboard["leaderboard"]
    }));
}

function stopSession() {
    activateCounter.flag = false;
    sendCommand(device_id.toString(), "stop")
    sendCommand(device_id2.toString(), "stop")
    state.active = true
    getDataa(getSessionData)
    stopp.style.visibility = "hidden"
    counter.style.visibility = "hidden"
    start.style.visibility = "visible"
    seconds.style.visibility = "hidden"
}
function sendEmail(name,mail,avgspeed,maxspeed,calbrnt,distcvrd) {
    //var doc = new jsPDF();
    Email.send({
        Host: "smtp.gmail.com",
        Username: "smartbike.sag@gmail.com",
        Password: "GITEX2021",
        To: mail,
        From: "smartbike.sag@gmail.com",
        Subject: "Smart Bike Session Stats",
        Body: "",
        Attachments : [
            {
                name : session.pdf,
                data : dataUri
            }]
    })
        
}
function startSession() {
graph=[['Speed', 'Time']]
    start.style.visibility = "hidden"
    counter.style.visibility = "visible"
    stopp.style.visibility = "visible"
    seconds.style.visibility = "visible"
    sendCommand(device_id.toString(), "start")
    sendCommand(device_id2.toString(), "start")
    powerMeterInterval = setInterval(
        updatePower, 200);

    connect().then(client => {
        console.log(client[0].clientId);
        client_id = client[0].clientId

        subscribe(client_id).then(subscription => {


            get_data(client_id)

        });

    });
    activateCounter.flag = true;

}

function logout() {
    fetch('https://swagdxb.eu-latest.cumulocity.com/inventory/managedObjects/' + device_id.toString(), {
        method: 'PUT',
        body: JSON.stringify({
            "login": false
        }),
        headers: headers,
        mode: "cors"
    });
    setTimeout(function() {
        window.location.reload(false);
    }, 1000);


}

function newSession() {
    stats.style.display = "none"
    table.style.display = "none"
    setTimeout(function() {
        summary.style.display = "block"

        chTab.speed = 800
    }, chTab.speed);
}

function leaderboard() {
    stats.style.display = "none"
    summary.style.display = "none"
    setTimeout(function() {
        table.style.display = "block"
        state.active = true
        getDataa(parseLeaderboard)

        chTab.speed = 800
    }, 1500);
}

function addRow(name, rank, points, maximumSpeed, averageSpeed, maximumPower, averagePower, distance, calories) {
    var suffix = "th"
    if (rank == 1.0) {
        suffix = "st"
    }
    if (rank == 2.0) {
        suffix = "nd"
    }
    if (rank == 3.0) {
        suffix = "rd"
    }
    document.getElementById("leaderboardrows").innerHTML += '<tr><td>' + rank + suffix + '<td>' + points + ' pts<td>' + name + '<td>' + maximumSpeed + ' km/hr<td>' + averageSpeed + ' km/hr<td>' + maximumPower + ' w<td>' + averagePower + ' w<td>' + distance + ' m<td>' + calories
}

function history() {
    summary.style.display = "none"
    table.style.display = "none"
    setTimeout(function() {
        state.active = true
        stats.style.display = "block"
        getDataa(parseSession)

        chTab.speed = 800
    }, chTab.speed);
}

function addSession(session) {
    document.getElementById("historyrows").innerHTML += "<tr><td><button id='" + "s" + session + "' type='button' onclick='popUp(id)' class='btn  btn-rounded  btn-block btn-lg' data-mdb-ripple-color='#ffffff' style='background-color:#5cccba;color:#011F3D'>" + session + "</button>"
}

function popUp(id) {
    var index = id.slice(1)
    var session = sessionList["session_" + index]
    console.log(id)
    graph=session["SpeedGraph"]
    console.log(graph)
    createChart()
    var name = sessionList["name"]
    document.getElementById("sessiontitle").innerHTML = "Session "+index.toString()+" Summary"
    document.getElementById("cn").innerHTML = name.charAt(0).toUpperCase() + name.slice(1)
    document.getElementById("bpi").src = session["image"];
    document.getElementById("sa").innerHTML = session["ShoulderAngle"].toString() + " degrees"
    document.getElementById("hf").innerHTML = session["HipFlexion"].toString() + " degrees"
    document.getElementById("kf").innerHTML = session["KneeFlexion"].toString() + " degrees"
    document.getElementById("he").innerHTML = session["HipExtension"].toString() + " degrees"
    document.getElementById("ke").innerHTML = session["KneeExtension"].toString() + " degrees"
    document.getElementById("ms").innerHTML = session["maxspd"].toString() + " km/hr"
    document.getElementById("as").innerHTML = session["avgspd"].toString() + " km/hr"
    document.getElementById("mp").innerHTML = session["power"].toString() + " w"
    document.getElementById("ap").innerHTML = session["avgpower"].toString() + " w"
    document.getElementById("cb").innerHTML = session["calbrnt"].toString() + " cal"
    document.getElementById("dc").innerHTML = session["distcvd"].toString() + " m"
    $("#myModal").modal('toggle');
}

function parseSession(data) {
    state.active = false
    document.getElementById("historytable").innerHTML = "<table cellspacing=0 data-page-length='3' class='table table-bordered table-hover table-inverse table-striped'id=example width=100%><thead><tr><th>Session<tfoot><tr><th>Session<tbody id='historyrows' ></table>"
    var response = JSON.parse(data);
    sessionList = response["leaderboard"][response["contestantEmail"]]
  
    var sessionListLength = Object.keys(sessionList).length

    document.getElementById("avgspd").innerHTML = "Average Speed<br>" + sessionList["AverageSpeed"].toString() + " km/hr"
    document.getElementById("avgpower").innerHTML = "Average Power<br>" + sessionList["AveragePower"].toString() + " w"
    document.getElementById("distance").innerHTML = "Total Distance Travelled<br>" + sessionList["TotalDistTravelled"].toString() + " m"
    document.getElementById("calories").innerHTML = "Total Calories Burnt<br>" + sessionList["TotalCalBurnt"].toString() + " cal"
    if (sessionListLength > 6) {

        for (let index = 1; index < sessionListLength - 5; index++) {
            addSession(index.toString())
        }
        $(document).ready(function() {
            $('#example').DataTable();
        });
        setTimeout(function() {
            document.getElementById("example_length").style.visibility = "hidden";
            document.getElementById("example_info").style.left = "5px";
        }, 50)
    }
}

function parseLeaderboard(data) {
    state.active = false
    document.getElementById("leaderboardtable").innerHTML = "<table cellspacing=0 data-page-length='4'class='table table-bordered table-hover table-inverse table-striped'id=example1 width=100% ><thead style='background-color: #5cccba;'><tr style='font-weight: normal'><th>Rank<th>Points<th>name<th>Maximum Speed<th>Average Speed<th>Maximum Power<th>Average Power<th>Total Distance Covered<th>Total Calories Burnt<tfoot style='font-weight: normal;background-color: #5cccba;'><tr><th>Rank<th>Points<th>name<th>Maximum Speed<th>Average Speed<th>Maximum Power<th>Average Power<th>Total Distance Covered<th>Total Calories Burnt<tbody id='leaderboardrows' style='font-weight: normal;'></table>"
    var response = JSON.parse(data);
    var leaderboard = response["leaderboard_ranked"]
    var currentSession = leaderboard[response["contestantEmail"]]
    var currentLength = Object.keys(currentSession).length
    if (currentLength > 6) {
        updateRank(currentSession["session_" + (currentLength - 6).toString()]["rank"])
    } else {
        updateRank("none")
    }

    var keyList = Object.keys(leaderboard)
    for (var key in keyList) {
        var session = leaderboard[keyList[key]]
        var length = Object.keys(session).length
        var name = session["name"]
        if (length > 6) {
            session = session["session_" + (length - 6).toString()]
            console.log(session)
            addRow(name, session["rank"], session["score"], session["maxspd"], session["avgspd"], session["power"], session["avgpower"], session["distcvd"], session["calbrnt"])
        }
    }
    $(document).ready(function() {
        $('#example1').DataTable();
    });
    setTimeout(function() {
        document.getElementById("example1_length").style.visibility = "hidden";
    }, 1)
}

function updateRank(rank) {
    if (rank == "none") {
        document.getElementById("rank").innerHTML = "unranked"
    } else {
        var suffix = "th"
        if (rank == 1.0) {
            suffix = "st"
        }
        if (rank == 2.0) {
            suffix = "nd"
        }
        if (rank == 3.0) {
            suffix = "rd"
        }
        document.getElementById("rank").innerHTML = "Rank: " + rank.toString() + suffix
    }
}