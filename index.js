let peer = new Peer({
  host: "peer-server.azurewebsites.net",
  port: 443,
  path: "/myapp",
  secure: true,
});

// my screenshare stream
let stream = null;
// my video element
let video = null;

let emptyAudioTrack = null;
let emptyVideoTrack = null;
let emptyMediaStream = null;

/////////////////////////////////////////////
// Frontend
/////////////////////////////////////////////
$(function () {
  video = document.getElementById("media");

  $("#peerIDCopy").click(() => {
    let peerID = document.getElementById("peerID");
    text = peerID.textContent;

    let e = document.createElement("textarea");
    e.value = text;

    document.body.appendChild(e);
    e.select();
    document.execCommand("copy");
    document.body.removeChild(e);
  });
});

/////////////////////////////////////////////
// Peer Listeners
/////////////////////////////////////////////
peer.on("open", function (id) {
  $("#peerID").text(id);
  $("#loading").hide();
});

peer.on("call", function (mediaConnection) {
  mediaConnection.answer(stream);
});

/////////////////////////////////////////////
// Actions
/////////////////////////////////////////////
let getStream = () => {
  // Connect with empty media stream
  if (emptyMediaStream == null) setEmptyMediaStream();

  // Get streamer ID from input field
  let streamerID = $("#streamerID").val();
  mediaConnection = peer.call(streamerID, emptyMediaStream);

  mediaConnection.on("close", () => {
    // console.log("Stream closed");
    video.style.height = "100%";
    video.srcObject = null;
    video.controls = false;
  });

  mediaConnection.on("stream", function (stream) {
    console.log("Got stream ", stream);
    video.srcObject = stream;

    video.onloadeddata = () => {
      video.muted = false;
      video.controls = true;
      video.style.height = "auto";
      video.play();
    };
  });
};

let setStream = async () => {
  let options = {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: 30,
    },
    audio: true,
  };

  try {
    stream = await navigator.mediaDevices.getDisplayMedia(options);
  } catch (e) {
    console.log("Error on setting stream: ", e);
  }

  // https://stackoverflow.com/questions/25141080/how-to-listen-for-stop-sharing-click-in-chrome-desktopcapture-api
  stream.getVideoTracks()[0].onended = () => {
    stopStream();
  };
};

let stopStream = () => {
  if (stream) {
    // Stop stream, then dereference it
    stream.getTracks().forEach((track) => {
      track.stop();
    });
    stream = null;

    // Stop all connections watching this tream
    for (let peerID in peer.connections) {
      conns = peer.connections[peerID];
      conns.forEach((i) => {
        i.close();
      });
    }
  }
};

/////////////////////////////////////////////
// Empty Streams
/////////////////////////////////////////////
let createEmptyAudioTrack = () => {
  let ctx = new AudioContext();
  let oscillator = ctx.createOscillator();
  let dst = oscillator.connect(ctx.createMediaStreamDestination());
  oscillator.start();
  let track = dst.stream.getAudioTracks()[0];
  return Object.assign(track, {
    enabled: false,
  });
};

let createEmptyVideoTrack = ({ width, height }) => {
  let canvas = Object.assign(document.createElement("canvas"), {
    width,
    height,
  });
  canvas.getContext("2d").fillRect(0, 0, width, height);

  let stream = canvas.captureStream();
  let track = stream.getVideoTracks()[0];

  return Object.assign(track, {
    enabled: false,
  });
};

let setEmptyMediaStream = () => {
  emptyAudioTrack = createEmptyAudioTrack();
  emptyVideoTrack = createEmptyVideoTrack({
    width: 600,
    height: 400,
  });
  emptyMediaStream = new MediaStream([emptyAudioTrack, emptyVideoTrack]);
};
