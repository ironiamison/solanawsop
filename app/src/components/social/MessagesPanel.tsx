"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BtnSecondary } from "@/components/home/lobby";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PublicUser } from "@/lib/social";
import UserAvatar from "./UserAvatar";

type Thread = {
  peer: PublicUser;
  lastMessage: { body: string; createdAt: string; senderId: string };
  unreadCount: number;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: PublicUser;
};

export default function MessagesPanel() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const peerFromUrl = searchParams.get("peer");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activePeer, setActivePeer] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await authFetch("/api/messages");
    if (!res.ok) return;
    const data = await res.json();
    setThreads(data.threads ?? []);
  }, [authFetch]);

  const loadConversation = useCallback(
    async (peerId: string) => {
      const res = await authFetch(`/api/messages?peerId=${peerId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    },
    [authFetch]
  );

  useEffect(() => {
    authFetch("/api/profile")
      .then((r) => r.json())
      .then((d) => d.user?.id && setMeId(d.user.id));
    loadThreads();
  }, [authFetch, loadThreads]);

  useEffect(() => {
    if (!peerFromUrl) return;
    const thread = threads.find((t) => t.peer.id === peerFromUrl);
    if (thread) {
      setActivePeer(thread.peer);
      loadConversation(peerFromUrl);
      return;
    }
    fetch(`/api/users/${peerFromUrl}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setActivePeer(d.user);
      });
    loadConversation(peerFromUrl);
  }, [peerFromUrl, threads, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectPeer = (peer: PublicUser) => {
    setActivePeer(peer);
    loadConversation(peer.id);
    loadThreads();
  };

  const send = async () => {
    if (!activePeer || !draft.trim()) return;
    const res = await authFetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: activePeer.id, body: draft }),
    });
    if (!res.ok) return;
    setDraft("");
    loadConversation(activePeer.id);
    loadThreads();
  };

  return (
    <div className="profile-messages">
      <aside className="profile-messages-sidebar">
        <div className="profile-messages-sidebar-head">
          <p className="profile-messages-label">Inbox</p>
          <span className="profile-messages-count">{threads.length}</span>
        </div>
        <ul className="profile-thread-list">
          {threads.length === 0 ? (
            <li className="profile-empty-inbox">
              No conversations yet — add friends and say hello.
            </li>
          ) : (
            threads.map((t) => (
              <li key={t.peer.id}>
                <button
                  type="button"
                  onClick={() => selectPeer(t.peer)}
                  className={`profile-thread${activePeer?.id === t.peer.id ? " profile-thread-active" : ""}`}
                >
                  <UserAvatar image={t.peer.image} name={t.peer.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="profile-thread-name">
                      {t.peer.twitterHandle
                        ? `@${t.peer.twitterHandle}`
                        : t.peer.name ?? "Player"}
                    </p>
                    <p className="profile-thread-preview">{t.lastMessage.body}</p>
                  </div>
                  {t.unreadCount > 0 && (
                    <span className="profile-thread-badge">{t.unreadCount}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <div className="profile-messages-main">
        {activePeer ? (
          <>
            <div className="profile-messages-peer">
              <UserAvatar image={activePeer.image} name={activePeer.name} size="sm" online />
              <div>
                <p className="profile-messages-peer-name">
                  {activePeer.name ?? "Player"}
                </p>
                {activePeer.twitterHandle && (
                  <p className="profile-messages-peer-handle">@{activePeer.twitterHandle}</p>
                )}
              </div>
            </div>
            <div className="profile-messages-scroll">
              {messages.map((m) => {
                const mine = m.senderId === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`profile-message-bubble${mine ? " profile-message-bubble-mine" : ""}`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="profile-messages-compose">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="profile-input flex-1"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              />
              <BtnSecondary onClick={send} className="profile-send-btn">
                Send
              </BtnSecondary>
            </div>
          </>
        ) : (
          <div className="profile-messages-empty">
            <p className="profile-empty-title">Select a conversation</p>
            <p className="profile-empty-copy">
              DM friends to coordinate buy-ins, invites, and table talk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
