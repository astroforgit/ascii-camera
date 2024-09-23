let pc1, pc2, dc1, dc2;
let options = {};

export function init(peerOptions) {
    options = peerOptions || {};

    // Default options or callbacks if not provided
    const doNothing = () => {};
    options.onOpen = options.onOpen || doNothing;
    options.onMessage = options.onMessage || doNothing;
    options.onError = options.onError || doNothing;
    options.onClose = options.onClose || doNothing;
    options.onConnectionStateChange = options.onConnectionStateChange || doNothing;

    // Create RTCPeerConnection objects
    pc1 = new RTCPeerConnection();
    pc2 = new RTCPeerConnection();

    // Set up ICE candidate exchange between peers
    pc1.onicecandidate = (e) => pc2.addIceCandidate(e.candidate).catch(options.onError);
    pc2.onicecandidate = (e) => pc1.addIceCandidate(e.candidate).catch(options.onError);

    // Set up connection state change event
    pc1.oniceconnectionstatechange = () => options.onConnectionStateChange(pc1.iceConnectionState);

    // Set up data channel on peer 2 (when pc1 creates it)
    pc2.ondatachannel = (e) => {
        dc2 = e.channel;
        dc2.onopen = options.onOpen;
        dc2.onmessage = (msg) => options.onMessage(msg.data);
        dc2.onerror = options.onError;
        dc2.onclose = options.onClose;
    };

    // Set up data channel on peer 1
    dc1 = pc1.createDataChannel("chat");
    dc1.onopen = options.onOpen;
    dc1.onmessage = (msg) => options.onMessage(msg.data);
    dc1.onerror = options.onError;
    dc1.onclose = options.onClose;

    // Initiate offer/answer exchange
    initiateOffer();
}

function initiateOffer() {
    pc1.createOffer()
        .then((offer) => pc1.setLocalDescription(offer))
        .then(() => pc2.setRemoteDescription(pc1.localDescription))
        .then(() => pc2.createAnswer())
        .then((answer) => pc2.setLocalDescription(answer))
        .then(() => pc1.setRemoteDescription(pc2.localDescription))
        .catch(options.onError);
}

// Send message through data channel
export function sendMessage(message) {
    if (dc1 && dc1.readyState === "open") {
        dc1.send(message);
    } else {
        options.onError("DataChannel is not open.");
    }
}

// Close the peer connections and data channels
export function closeConnection() {
    if (dc1) dc1.close();
    if (dc2) dc2.close();
    if (pc1) pc1.close();
    if (pc2) pc2.close();
}
