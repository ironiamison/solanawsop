export type TutorialStep = {
  id: string;
  /** Navigate here when this step is shown */
  route: string;
  title: string;
  body: string;
  /** Optional element to spotlight */
  highlight?: string;
  /** Final step — spectate demo */
  finale?: boolean;
};

export const TUTORIAL_STORAGE_KEY = "solanawsop_tutorial_done";
export const TUTORIAL_ACTIVE_KEY = "solanawsop_tutorial_active";

export const SITE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    route: "/",
    title: "Welcome to SolanaWSOP",
    body:
      "This quick tour shows where everything lives — free demo, real cash tables, tournaments, private games, bot practice, and social features. Takes about two minutes.",
  },
  {
    id: "nav",
    route: "/",
    title: "Site navigation",
    body:
      "Use the top bar (desktop) or bottom dock (mobile) to jump between Home, Play, Tournaments, Messages, and Profile. You're always one tap from the lobby.",
    highlight: "[data-tour='top-nav']",
  },
  {
    id: "cash",
    route: "/#cash-games",
    title: "Cash games — real $SWSOP",
    body:
      "Public tables use on-chain escrow. Connect your wallet, pick a buy-in tier (50K–1M $SWSOP), take a seat, and play Texas Hold'em with verifiable vault payouts.",
    highlight: "#cash-games",
  },
  {
    id: "demo",
    route: "/",
    title: "Free demo play",
    body:
      "No wallet required. Pick a username, join a shared 6-max table with play chips, chat, and voice. Perfect for learning the UI before wagering tokens.",
    highlight: "[data-tour='free-play']",
  },
  {
    id: "tournaments",
    route: "/tournaments",
    title: "Tournaments",
    body:
      "Bracket events, weekly championships, and freerolls. Register from this page — Grand Opening is free entry with real prize pools.",
    highlight: "[data-tour='tournaments-page']",
  },
  {
    id: "leaderboard",
    route: "/leaderboard",
    title: "Leaderboard",
    body:
      "Track top winners and reward points across the community. Climb by playing hands and completing missions.",
  },
  {
    id: "friends",
    route: "/friends",
    title: "Friends",
    body:
      "Search players by @handle or wallet, send friend requests, and see who's online. Great for organizing home games.",
  },
  {
    id: "messages",
    route: "/messages",
    title: "Messages",
    body:
      "Direct messages with friends — coordinate private tables, share invites, and chat off the felt.",
  },
  {
    id: "profile",
    route: "/profile",
    title: "Profile & rewards",
    body:
      "Your hub for stats, X verification, referral links, and reward points. Connect a wallet to unlock redemptions and on-chain play.",
    highlight: "[data-tour='profile-hero']",
  },
  {
    id: "private",
    route: "/profile?tab=tables",
    title: "Private tables",
    body:
      "Create invite-only tables for friends — on-chain SOL tables with optional rake, or $SWSOP chip private rooms. Share a link and only invited wallets can sit.",
    highlight: "[data-tour='private-tables']",
  },
  {
    id: "bots",
    route: "/profile/practice",
    title: "Bot practice",
    body:
      "Solo practice vs AI opponents on a private table. Connect your wallet, then sharpen pre-flop and post-flop decisions without pressure from live players.",
    highlight: "[data-tour='bot-practice']",
  },
  {
    id: "fairness",
    route: "/fairness",
    title: "Fairness & verification",
    body:
      "See what's provably on-chain today — escrow, program rules, and shuffle commitments. Transparency before you wager.",
  },
  {
    id: "spectate",
    route: "/demo?tutorial=spectate",
    title: "Watch a live demo hand",
    body:
      "Last stop: you'll enter the free-play table as a spectator. Watch the action, read chat, and take a seat whenever you're ready.",
    finale: true,
  },
];
