"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Plus,
  Filter,
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  Loader2,
  Tag,
  User,
  X,
  Send,
  ThumbsUp,
  Sparkles,
  Vote,
} from "lucide-react";

/* ======================================================================== */
/*  Types                                                                   */
/* ======================================================================== */

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
  category: ProposalCategory;
  status: ProposalStatus;
  votes: number;
  /** Track individual up/down so a user can only vote once */
  userVote: "up" | "down" | null;
  comments: Comment[];
  createdAt: number;
}

type ProposalCategory =
  | "feature"
  | "integration"
  | "ui"
  | "tokenomics"
  | "governance"
  | "bug";

type ProposalStatus = "open" | "in_progress" | "completed" | "rejected";

type SortMode = "hot" | "new" | "top";

/* ======================================================================== */
/*  Constants                                                               */
/* ======================================================================== */

const CATEGORY_CONFIG: Record<
  ProposalCategory,
  { label: string; color: string; bg: string }
> = {
  feature: {
    label: "Feature",
    color: "text-purple-300",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  integration: {
    label: "Integration",
    color: "text-blue-300",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  ui: {
    label: "UI / UX",
    color: "text-pink-300",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
  tokenomics: {
    label: "Tokenomics",
    color: "text-yellow-300",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  governance: {
    label: "Governance",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  bug: {
    label: "Bug Fix",
    color: "text-red-300",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  open: {
    label: "Open",
    color: "text-blue-400",
    icon: <Circle className="w-3 h-3" />,
  },
  in_progress: {
    label: "In Progress",
    color: "text-yellow-400",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-400",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-gray-500",
    icon: <X className="w-3 h-3" />,
  },
};

const SEED_PROPOSALS: Proposal[] = [
  {
    id: "seed-1",
    title: "Add Bitcoin (BTC) price oracle support",
    description:
      "Extend the multi-chain oracle to cover Bitcoin pricing. This would make Apollon a comprehensive cross-chain oracle, attracting DeFi protocols that need BTC reference prices.",
    author: "satoshi_fan",
    category: "integration",
    status: "open",
    votes: 42,
    userVote: null,
    comments: [
      {
        id: "c1",
        author: "defi_builder",
        text: "Absolutely needed. BTC is the benchmark for the whole market.",
        timestamp: Date.now() - 86400000,
      },
    ],
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    id: "seed-2",
    title: "Implement staking rewards for prediction game participants",
    description:
      "Allow users to stake NEAR tokens and earn bonus prediction game points. Correct predictions while staking would yield token rewards from a community pool. This creates real economic incentives.",
    author: "yield_maxi",
    category: "tokenomics",
    status: "open",
    votes: 38,
    userVote: null,
    comments: [
      {
        id: "c2",
        author: "near_whale",
        text: "Would love to stake and earn while predicting!",
        timestamp: Date.now() - 172800000,
      },
      {
        id: "c3",
        author: "risk_averse",
        text: "Need to be careful about impermanent loss considerations.",
        timestamp: Date.now() - 100000000,
      },
    ],
    createdAt: Date.now() - 5 * 86400000,
  },
  {
    id: "seed-3",
    title: "Dark/Light mode toggle",
    description:
      "Add a theme switcher so users can toggle between the current dark Pyth-style theme and a clean light mode for daytime use.",
    author: "ui_designer",
    category: "ui",
    status: "in_progress",
    votes: 27,
    userVote: null,
    comments: [],
    createdAt: Date.now() - 7 * 86400000,
  },
  {
    id: "seed-4",
    title: "Multi-sig governance for oracle parameter updates",
    description:
      "Require a DAO multi-sig vote before changing oracle parameters like model weights, confidence thresholds, or adding new token feeds. This ensures decentralized control.",
    author: "gov_nerd",
    category: "governance",
    status: "open",
    votes: 19,
    userVote: null,
    comments: [
      {
        id: "c4",
        author: "security_first",
        text: "Essential for trust. Single admin keys are a centralization risk.",
        timestamp: Date.now() - 50000000,
      },
    ],
    createdAt: Date.now() - 10 * 86400000,
  },
  {
    id: "seed-5",
    title: "Mobile-responsive prediction game with push notifications",
    description:
      "Optimize the prediction game for mobile screens and add optional push notifications when predictions are about to expire or have been resolved.",
    author: "mobile_first",
    category: "feature",
    status: "open",
    votes: 15,
    userVote: null,
    comments: [],
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: "seed-6",
    title: "Fix chart tooltip clipping on small screens",
    description:
      "The price chart tooltip gets clipped at the edge of the container on tablets. Needs a boundary-aware tooltip placement.",
    author: "bug_hunter",
    category: "bug",
    status: "completed",
    votes: 8,
    userVote: null,
    comments: [],
    createdAt: Date.now() - 14 * 86400000,
  },
];

/* ======================================================================== */
/*  Persistence helpers                                                     */
/* ======================================================================== */

const STORAGE_KEY = "apollon_dao_proposals";

function loadProposals(): Proposal[] {
  if (typeof window === "undefined") return SEED_PROPOSALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return SEED_PROPOSALS;
}

function saveProposals(proposals: Proposal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

/* ======================================================================== */
/*  Component                                                               */
/* ======================================================================== */

export default function DaoForum() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("hot");
  const [filterCategory, setFilterCategory] = useState<
    ProposalCategory | "all"
  >("all");
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | "all">(
    "all"
  );
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New proposal form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<ProposalCategory>("feature");
  const [newAuthor, setNewAuthor] = useState("");

  // Comment
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    setProposals(loadProposals());
  }, []);

  const persist = useCallback(
    (updated: Proposal[]) => {
      setProposals(updated);
      saveProposals(updated);
    },
    []
  );

  /* ---- Voting ---- */
  const handleVote = (id: string, dir: "up" | "down") => {
    persist(
      proposals.map((p) => {
        if (p.id !== id) return p;
        if (p.userVote === dir) {
          // Undo vote
          return {
            ...p,
            votes: p.votes + (dir === "up" ? -1 : 1),
            userVote: null,
          };
        }
        const delta =
          dir === "up"
            ? p.userVote === "down"
              ? 2
              : 1
            : p.userVote === "up"
            ? -2
            : -1;
        return { ...p, votes: p.votes + delta, userVote: dir };
      })
    );
  };

  /* ---- Submit proposal ---- */
  const handleSubmit = () => {
    if (!newTitle.trim() || !newDesc.trim()) return;
    const proposal: Proposal = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      author: newAuthor.trim() || "anon",
      category: newCategory,
      status: "open",
      votes: 1,
      userVote: "up",
      comments: [],
      createdAt: Date.now(),
    };
    persist([proposal, ...proposals]);
    setNewTitle("");
    setNewDesc("");
    setNewAuthor("");
    setShowNewForm(false);
  };

  /* ---- Add comment ---- */
  const handleAddComment = (proposalId: string) => {
    if (!commentText.trim()) return;
    persist(
      proposals.map((p) => {
        if (p.id !== proposalId) return p;
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: `cm-${Date.now()}`,
              author: "you",
              text: commentText.trim(),
              timestamp: Date.now(),
            },
          ],
        };
      })
    );
    setCommentText("");
  };

  /* ---- Sorting & Filtering ---- */
  const sorted = [...proposals]
    .filter(
      (p) => filterCategory === "all" || p.category === filterCategory
    )
    .filter((p) => filterStatus === "all" || p.status === filterStatus)
    .sort((a, b) => {
      if (sortMode === "top") return b.votes - a.votes;
      if (sortMode === "new") return b.createdAt - a.createdAt;
      // "hot" = votes weighted by recency
      const ageA = (Date.now() - a.createdAt) / 3600000; // hours
      const ageB = (Date.now() - b.createdAt) / 3600000;
      const scoreA = a.votes / Math.pow(ageA + 2, 1.2);
      const scoreB = b.votes / Math.pow(ageB + 2, 1.2);
      return scoreB - scoreA;
    });

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* ================ Header ================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Vote className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">DAO Forum</h1>
            <p className="text-gray-500 text-sm">
              Propose &amp; vote on the next features for Apollon
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="pyth-btn-primary px-5 py-2.5 flex items-center gap-2 text-sm w-fit"
        >
          {showNewForm ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {showNewForm ? "Cancel" : "New Proposal"}
        </button>
      </div>

      {/* ================ New Proposal Form ================ */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pyth-card-elevated p-6 space-y-4">
              <h3 className="text-sm font-semibold text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Submit a Proposal
              </h3>

              {/* Author */}
              <div>
                <label className="text-[11px] text-gray-500 font-medium block mb-1.5">
                  Your Name (optional)
                </label>
                <input
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="anon"
                  className="w-full bg-white/[0.03] border border-purple-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 transition-colors"
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] text-gray-500 font-medium block mb-1.5">
                  Proposal Title *
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="A concise title for your proposal..."
                  className="w-full bg-white/[0.03] border border-purple-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-gray-500 font-medium block mb-1.5">
                  Description *
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={4}
                  placeholder="Describe the feature, why it matters, and how it should work..."
                  className="w-full bg-white/[0.03] border border-purple-500/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 transition-colors resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] text-gray-500 font-medium block mb-1.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(CATEGORY_CONFIG) as [
                      ProposalCategory,
                      (typeof CATEGORY_CONFIG)[ProposalCategory]
                    ][]
                  ).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setNewCategory(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        newCategory === key
                          ? `${cfg.bg} ${cfg.color}`
                          : "border-white/5 bg-white/[0.02] text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim() || !newDesc.trim()}
                className="pyth-btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                Submit Proposal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================ Filters & Sort ================ */}
      <div className="pyth-card p-4 flex flex-col md:flex-row md:items-center gap-4">
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-500" />
          {(
            [
              { key: "hot", label: "Hot", icon: Flame },
              { key: "new", label: "New", icon: Clock },
              { key: "top", label: "Top", icon: ThumbsUp },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                sortMode === key
                  ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-gray-600" />
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              filterCategory === "all"
                ? "bg-white/10 text-white"
                : "text-gray-600 hover:text-gray-400"
            }`}
          >
            All
          </button>
          {(
            Object.entries(CATEGORY_CONFIG) as [
              ProposalCategory,
              (typeof CATEGORY_CONFIG)[ProposalCategory]
            ][]
          ).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                filterCategory === key
                  ? `${cfg.color} bg-white/5`
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 md:ml-auto flex-wrap">
          {(
            [
              ["all", "All"] as const,
              ...Object.entries(STATUS_CONFIG).map(
                ([k, v]) => [k, v.label] as const
              ),
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                setFilterStatus(key as ProposalStatus | "all")
              }
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                filterStatus === key
                  ? "bg-white/10 text-white"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ================ Proposal List ================ */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="pyth-card p-10 text-center">
            <Vote className="w-10 h-10 text-purple-500/30 mx-auto mb-3" />
            <div className="text-gray-500 text-sm">
              No proposals match your filters.
            </div>
          </div>
        )}

        {sorted.map((proposal) => {
          const cat = CATEGORY_CONFIG[proposal.category];
          const status = STATUS_CONFIG[proposal.status];
          const isExpanded = expandedId === proposal.id;

          return (
            <motion.div
              key={proposal.id}
              layout
              className="pyth-card hover:border-purple-500/15 transition-all"
            >
              <div className="flex">
                {/* Vote Column */}
                <div className="flex flex-col items-center gap-0.5 py-4 px-3 border-r border-white/5">
                  <button
                    onClick={() => handleVote(proposal.id, "up")}
                    className={`p-1 rounded-md transition-colors ${
                      proposal.userVote === "up"
                        ? "text-purple-400 bg-purple-500/15"
                        : "text-gray-600 hover:text-purple-300 hover:bg-purple-500/5"
                    }`}
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span
                    className={`text-sm font-bold font-mono ${
                      proposal.votes > 0
                        ? "text-purple-200"
                        : proposal.votes < 0
                        ? "text-red-400"
                        : "text-gray-500"
                    }`}
                  >
                    {proposal.votes}
                  </span>
                  <button
                    onClick={() => handleVote(proposal.id, "down")}
                    className={`p-1 rounded-md transition-colors ${
                      proposal.userVote === "down"
                        ? "text-red-400 bg-red-500/15"
                        : "text-gray-600 hover:text-red-300 hover:bg-red-500/5"
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Column */}
                <div className="flex-1 p-4 min-w-0">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.bg} ${cat.color}`}
                    >
                      {cat.label}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-semibold ${status.color}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      by{" "}
                      <span className="text-gray-400">{proposal.author}</span>{" "}
                      &middot; {timeAgo(proposal.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : proposal.id)
                    }
                    className="text-left w-full"
                  >
                    <h3 className="text-sm font-semibold text-white hover:text-purple-200 transition-colors leading-snug">
                      {proposal.title}
                    </h3>
                  </button>

                  {/* Collapsed preview */}
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>
                  )}

                  {/* Comment count */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : proposal.id)
                    }
                    className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 hover:text-purple-300 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {proposal.comments.length} comment
                    {proposal.comments.length !== 1 && "s"}
                  </button>

                  {/* ---- Expanded Section ---- */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {/* Full description */}
                        <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                          {proposal.description}
                        </p>

                        {/* Comments */}
                        {proposal.comments.length > 0 && (
                          <div className="mt-4 space-y-2.5">
                            <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                              Discussion
                            </div>
                            {proposal.comments.map((c) => (
                              <div
                                key={c.id}
                                className="rounded-lg bg-white/[0.02] border border-white/5 p-3"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-3 h-3 text-gray-600" />
                                  <span className="text-[11px] text-purple-300 font-semibold">
                                    {c.author}
                                  </span>
                                  <span className="text-[10px] text-gray-600">
                                    {timeAgo(c.timestamp)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  {c.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Comment */}
                        <div className="mt-4 flex gap-2">
                          <input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddComment(proposal.id);
                              }
                            }}
                            placeholder="Add a comment..."
                            className="flex-1 bg-white/[0.03] border border-purple-500/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 transition-colors"
                          />
                          <button
                            onClick={() => handleAddComment(proposal.id)}
                            disabled={!commentText.trim()}
                            className="pyth-btn-ghost px-3 py-2 rounded-lg text-purple-400 disabled:opacity-30"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ================ Stats Footer ================ */}
      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-4 border-t border-purple-500/5">
        <div>
          {proposals.length} proposals &middot;{" "}
          {proposals.filter((p) => p.status === "open").length} open &middot;{" "}
          {proposals.reduce((s, p) => s + p.comments.length, 0)} comments
        </div>
        <div>
          Votes &amp; proposals stored locally &middot; On-chain governance
          coming soon
        </div>
      </div>
    </div>
  );
}
