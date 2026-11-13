import { ArrowUpRight, Compass } from 'lucide-react';

export function CompassArt() {
  return (
    <div className="compass-art" aria-hidden="true">
      <div className="art-topline">
        <span>THE JOURNEY COLLECTION</span>
        <span>01 / FOUNDATION</span>
      </div>
      <div className="orbital-art">
        <svg viewBox="0 0 440 350" fill="none">
          <ellipse cx="220" cy="180" rx="170" ry="130" stroke="currentColor" />
          <ellipse cx="220" cy="180" rx="130" ry="130" stroke="currentColor" />
          <ellipse cx="220" cy="180" rx="75" ry="130" stroke="currentColor" />
          <path
            d="M50 180h340M67 125h306M67 235h306M110 80h220M110 280h220M220 50v260"
            stroke="currentColor"
          />
          <circle cx="220" cy="180" r="153" stroke="currentColor" strokeDasharray="2 10" />
          <path
            d="m265 101-28 104-93 58 29-104 92-58Z"
            fill="#0B6764"
            stroke="#0B6764"
            strokeWidth="2"
          />
          <path d="m220 180 45-79-28 104-93 58 76-83Z" fill="#F7F5F0" />
          <circle cx="220" cy="180" r="7" fill="#0B6764" stroke="#F7F5F0" strokeWidth="3" />
        </svg>
        <span className="art-north">N</span>
        <span className="art-east">E</span>
        <span className="art-south">S</span>
        <span className="art-west">W</span>
      </div>
      <div className="art-bottomline">
        <span>
          A little direction.
          <br />
          <em>A world of possibility.</em>
        </span>
        <ArrowUpRight />
      </div>
      <div className="art-seal">
        <Compass strokeWidth={1.3} />
        <span>
          TAKE THE
          <br />
          SCENIC ROUTE
        </span>
      </div>
    </div>
  );
}
