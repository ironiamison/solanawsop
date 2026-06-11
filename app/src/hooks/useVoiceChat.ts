"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useVoiceChat(
  socket: React.RefObject<Socket | null>,
  roomId: string | null,
  wallet: string | null,
  enabled: boolean
) {
  const [isMuted, setIsMuted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());

  const cleanupPeer = useCallback((peerId: string) => {
    peerConnections.current.get(peerId)?.close();
    peerConnections.current.delete(peerId);
    const audio = audioElements.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      audioElements.current.delete(peerId);
    }
    setPeers((p) => p.filter((id) => id !== peerId));
  }, []);

  const createPeerConnection = useCallback(
    async (peerId: string, initiator: boolean) => {
      if (!socket.current || !roomId || !wallet) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnections.current.set(peerId, pc);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        let audio = audioElements.current.get(peerId);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audioElements.current.set(peerId, audio);
        }
        audio.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current?.emit("voice-signal", {
            roomId,
            to: peerId,
            fromWallet: wallet,
            signal: { candidate: event.candidate },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          cleanupPeer(peerId);
        }
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.current.emit("voice-signal", {
          roomId,
          to: peerId,
          fromWallet: wallet,
          signal: { sdp: pc.localDescription },
        });
      }

      setPeers((p) => (p.includes(peerId) ? p : [...p, peerId]));
    },
    [cleanupPeer, roomId, socket, wallet]
  );

  const handleSignal = useCallback(
    async (data: {
      from: string;
      fromWallet: string;
      signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    }) => {
      let pc = peerConnections.current.get(data.from);
      if (!pc) {
        await createPeerConnection(data.from, false);
        pc = peerConnections.current.get(data.from);
      }
      if (!pc) return;

      if (data.signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
        if (data.signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.current?.emit("voice-signal", {
            roomId,
            to: data.from,
            fromWallet: wallet,
            signal: { sdp: pc.localDescription },
          });
        }
      } else if (data.signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    },
    [createPeerConnection, roomId, socket, wallet]
  );

  const startVoice = useCallback(async () => {
    if (!socket.current || !roomId || !wallet) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsActive(true);
      socket.current.emit("voice-join", { roomId, wallet });
    } catch {
      alert("Microphone access denied. Enable mic permissions for voice chat.");
    }
  }, [roomId, socket, wallet]);

  const stopVoice = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerConnections.current.forEach((_, id) => cleanupPeer(id));
    setIsActive(false);
    setPeers([]);
  }, [cleanupPeer]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = isMuted;
    });
    setIsMuted((m) => !m);
  }, [isMuted]);

  useEffect(() => {
    if (!enabled || !socket.current || !roomId) return;

    const s = socket.current;
    const onPeerJoined = ({ peerId }: { peerId: string }) => {
      if (isActive) createPeerConnection(peerId, true);
    };
    const onPeerLeft = ({ peerId }: { peerId: string }) => cleanupPeer(peerId);
    const onSignal = (data: Parameters<typeof handleSignal>[0]) => {
      if (isActive) handleSignal(data);
    };

    s.on("voice-peer-joined", onPeerJoined);
    s.on("voice-peer-left", onPeerLeft);
    s.on("voice-signal", onSignal);

    return () => {
      s.off("voice-peer-joined", onPeerJoined);
      s.off("voice-peer-left", onPeerLeft);
      s.off("voice-signal", onSignal);
    };
  }, [cleanupPeer, createPeerConnection, enabled, handleSignal, isActive, roomId, socket]);

  useEffect(() => {
    if (!enabled) stopVoice();
  }, [enabled, stopVoice]);

  return { isActive, isMuted, peers, startVoice, stopVoice, toggleMute };
}
