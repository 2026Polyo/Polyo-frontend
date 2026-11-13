import { ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchRanking, type RankingEntry, type RankingType } from "../api/ranking";
import medalBronze from "../asset/medal-bronze.svg";
import medalGold from "../asset/medal-gold.svg";
import medalSilver from "../asset/medal-silver.svg";

interface RankingScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const CATEGORIES: { type: RankingType; label: string }[] = [
  { type: "normal", label: "일반모드" },
  { type: "hard", label: "하드모드" },
  { type: "trophy", label: "트로피" }
];

const MEDAL_ASSETS = {
  1: { alt: "금메달", src: medalGold },
  2: { alt: "은메달", src: medalSilver },
  3: { alt: "동메달", src: medalBronze },
} as const;

function RankingScreen({ onBack, currentUserId }: RankingScreenProps) {
  const [activeType, setActiveType] = useState<RankingType>("normal");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(async (type: RankingType) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRanking(type);
      setRankings(result.rankings);
    } catch (requestError) {
      setRankings([]);
      setError(requestError instanceof Error ? requestError.message : "랭킹을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRanking(activeType);
  }, [activeType, loadRanking]);

  const topRankings = rankings.slice(0, 20);
  const myRanking = rankings.find((entry) => entry.userId === currentUserId) ?? null;
  const showMyRankingBelow = myRanking !== null && myRanking.rank > 20;

  return (
    <main className="app-shell ranking-shell">
      <section className="ranking-screen" aria-labelledby="ranking-title">
        <header className="ranking-header">
          <button className="ranking-back-action" onClick={onBack} type="button">
            <ArrowLeft size={19} aria-hidden="true" />
            메인으로
          </button>
          <div className="ranking-heading">
            <Trophy size={28} aria-hidden="true" />
            <h1 id="ranking-title">랭킹</h1>
          </div>
        </header>

        <div className="ranking-tabs" role="tablist" aria-label="랭킹 카테고리">
          {CATEGORIES.map((category) => (
            <button
              aria-selected={activeType === category.type}
              className={activeType === category.type ? "ranking-tab is-active" : "ranking-tab"}
              key={category.type}
              onClick={() => setActiveType(category.type)}
              role="tab"
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>

        <section className="ranking-card" aria-live="polite">
          <div className="ranking-card-heading">
            <div>
              <span className="ranking-eyebrow">TOP PLAYERS</span>
              <h2>{CATEGORIES.find((category) => category.type === activeType)?.label}</h2>
            </div>
            <button
              aria-label="랭킹 새로고침"
              className="ranking-refresh-action"
              disabled={loading}
              onClick={() => void loadRanking(activeType)}
              type="button"
            >
              <RefreshCw className={loading ? "is-spinning" : undefined} size={18} aria-hidden="true" />
            </button>
          </div>

          {loading ? (
            <p className="ranking-state">랭킹을 불러오는 중입니다...</p>
          ) : error ? (
            <div className="ranking-state ranking-error">
              <p>{error}</p>
              <button className="ranking-retry-action" onClick={() => void loadRanking(activeType)} type="button">
                다시 시도
              </button>
            </div>
          ) : rankings.length === 0 ? (
            <p className="ranking-state">아직 등록된 랭킹이 없습니다.</p>
          ) : (
            <ol aria-label="랭킹 목록" className="ranking-list">
              {topRankings.map((entry) => (
                <RankingRow currentUserId={currentUserId} entry={entry} key={`${entry.userId}-${entry.rank}`} />
              ))}
              {showMyRankingBelow && myRanking && (
                <>
                  <li aria-hidden="true" className="ranking-ellipsis">⋮</li>
                  <RankingRow currentUserId={currentUserId} entry={myRanking} />
                </>
              )}
            </ol>
          )}
        </section>
      </section>
    </main>
  );
}

function RankingRow({ currentUserId, entry }: { currentUserId: string; entry: RankingEntry }) {
  const isCurrentUser = entry.userId === currentUserId;
  const className = [
    "ranking-row",
    entry.rank <= 3 ? `rank-${entry.rank}` : "",
    isCurrentUser ? "is-current-user" : ""
  ].filter(Boolean).join(" ");
  const medal = MEDAL_ASSETS[entry.rank as keyof typeof MEDAL_ASSETS];

  return (
    <li aria-current={isCurrentUser ? "true" : undefined} className={className}>
      <span aria-label={`${entry.rank}위`} className="ranking-position">
        {medal ? <img alt={medal.alt} className="ranking-medal" src={medal.src} /> : entry.rank}
      </span>
      <span className="ranking-nickname">{entry.nickname}{isCurrentUser && <span className="ranking-you">나</span>}</span>
      <strong className="ranking-score">{entry.score.toLocaleString()}</strong>
    </li>
  );
}

export default RankingScreen;
