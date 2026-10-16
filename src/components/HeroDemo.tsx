"use client";

import {
  useEffect,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { HERO_VARIANTS, variantAssets } from "@/lib/hero-variants";

/* Landing-hero phone demo: a 10s, four-beat CSS loop showing the product
   end-to-end. The couple on screen rotates once per loop through the
   HERO_VARIANTS mixes (Yoruba/Igbo/Hausa/English) — names, monogram, guest,
   codes and the pre-rendered og/card/pass assets all swap together on the
   beat-1 loop boundary, so nothing ever mismatches. The invitation hero photo
   falls back to gallery-1.jpg if an asset is missing. */

const HERO_URL = "/marketing/gallery-1.jpg";
const FALLBACK_URL = "/marketing/gallery-1.jpg";

const CONFETTI_COLORS = ["#D4AF37", "#E8D3C4", "#F9F8F6", "#B8912A"];

const CONFETTI = Array.from({ length: 18 }, (_, k) => ({
  key: k,
  x: 4 + ((k * 53) % 90),
  d: -((k * 7) % 10) / 30,
  color: CONFETTI_COLORS[k % 4],
  r: (k % 2 ? 1 : -1) * (240 + ((k * 41) % 480)),
}));

function applyFallback(el: HTMLImageElement) {
  if (el.dataset.fb) return;
  el.dataset.fb = "1";
  el.src = FALLBACK_URL;
}

function imgFallback(e: SyntheticEvent<HTMLImageElement>) {
  applyFallback(e.currentTarget);
}

export default function HeroDemo() {
  const [vi, setVi] = useState(0);
  const v = HERO_VARIANTS[vi];
  const assets = variantAssets(v);

  // Swap the couple exactly on the beat-1 loop boundary (10s), while the
  // other three screens are hidden and the typed RSVP fields are still 0.
  const onLoop = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setVi((i) => (i + 1) % HERO_VARIANTS.length);
  };

  // Warm every variant's assets so loop swaps are instant.
  useEffect(() => {
    HERO_VARIANTS.forEach((variant) => {
      const a = variantAssets(variant);
      [a.og, a.card, a.pass].forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    });
  }, []);

  // If a live render hangs (slow DB, cold worker) rather than erroring,
  // onError never fires — swap to the placeholder after a beat.
  useEffect(() => {
    const t = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLImageElement>(
          "figure.demo img[data-fallback]",
        )
        .forEach((el) => {
          if (el.naturalWidth === 0) applyFallback(el);
        });
    }, 5000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <figure
      className="demo"
      role="img"
      aria-label="How Aravow works: the couple shares one link on WhatsApp, a guest opens the invitation and RSVPs, receives a personal pass, and the couple sees the new guest on their dashboard."
    >
      <div className="phone-wrap" aria-hidden="true">
        <div className="phone">
          <div className="notch" />
          <div className="screen">
            {/* Beat 1: WhatsApp message with the OG preview */}
            <div className="scr s1 wa" onAnimationIteration={onLoop}>
              <div className="wa-head">
                <span className="wa-back">‹</span>
                <span className="wa-av">M</span>
                <div>
                  <b>Mummy</b>
                  <small>online</small>
                </div>
              </div>
              <div className="wa-body">
                <div className="msg">
                  The date is finally out o! 🎉
                  <time>9:41</time>
                </div>
                <div className="msg invite">
                  <div className="og">
                    <div className="og-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assets.og}
                        alt=""
                        loading="eager"
                        decoding="async"
                        data-fallback=""
                        onError={imgFallback}
                      />
                    </div>
                    <div className="og-text">
                      <b>
                        {v.groom} &amp; {v.bride}
                      </b>
                      <small>
                        Join us in celebrating the wedding of{" "}
                        <span>
                          {v.groom} &amp; {v.bride}
                        </span>
                        . RSVP at the link inside.
                      </small>
                      <em>aravow.org</em>
                    </div>
                  </div>
                  <p className="lnk">aravow.org/w/{v.slug}</p>
                  <time>
                    9:42
                    <span className="ticks">✓✓</span>
                  </time>
                  <span className="ripple r1" />
                </div>
              </div>
              <div className="wa-input">Message</div>
            </div>

            {/* Beat 2: the public invitation page, scrolled hero → RSVP */}
            <div className="scr s2">
              <div className="inv-scroll">
                <div className="inv-hero">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={HERO_URL} alt="" loading="eager" decoding="async" />
                  <p className="inv-mono">{v.monogram}</p>
                  <p className="inv-eyebrow">The Wedding Celebration of</p>
                  <h3 className="inv-names">
                    {v.groom} <span className="amp">&amp;</span> {v.bride}
                  </h3>
                  <p className="inv-date">{v.dateLong}</p>
                </div>
                <div className="inv-body">
                  <div className="card-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={assets.card}
                      alt=""
                      loading="eager"
                      decoding="async"
                      data-fallback=""
                      onError={imgFallback}
                    />
                  </div>
                  <div className="cer">
                    <b>Traditional / Engagement</b>
                    <span>{v.tradWhen}</span>
                    <span>{v.tradVenue}</span>
                    <span className="muted">Aso-oke, wine and gold</span>
                    <a>View on Google Maps →</a>
                  </div>
                  <div className="cer rec">
                    <b>Reception</b>
                    <span>{v.recvWhen}</span>
                    <span>Victoria Island, Lagos</span>
                    <span className="muted">
                      Black tie with a touch of gold
                    </span>
                    <a>View on Google Maps →</a>
                  </div>
                  <div className="form">
                    <p className="f-title">Are you attending?</p>
                    <div className="row">
                      <div className="field">
                        <label>First name</label>
                        <div className="input">
                          <span className="typed t1">{v.guest.first}</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>Last name</label>
                        <div className="input">
                          <span className="typed t2">{v.guest.last}</span>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field" style={{ flex: 2 }}>
                        <label>Phone</label>
                        <div className="input">
                          <span className="typed t3">0803 000 0000</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>Side</label>
                        <div className="input">Groom&rsquo;s</div>
                      </div>
                    </div>
                    <div className="consent">
                      <span className="box">✓</span>I agree to share my details
                      with the couple
                    </div>
                    <div className="rsvp-btn">
                      RSVP
                      <span className="ripple r2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Beat 3: celebration screen with the pass PNG */}
            <div className="scr s3 cel">
              <div className="confetti">
                {CONFETTI.map((c) => (
                  <i
                    key={c.key}
                    style={
                      {
                        "--x": `${c.x}%`,
                        "--d": `${c.d}s`,
                        "--c": c.color,
                        "--r": `${c.r}deg`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <p className="cel-k">
                You&rsquo;re on the list, <span>{v.guest.first}</span>
              </p>
              <p className="cel-code">{v.guestCode}</p>
              <div className="pass">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assets.pass}
                  alt=""
                  loading="eager"
                  decoding="async"
                  data-fallback=""
                  onError={imgFallback}
                />
              </div>
              <div className="actions">
                <span>Download PNG</span>
                <span className="wa-btn">Share on WhatsApp</span>
                <span>Add to Calendar</span>
              </div>
            </div>

            {/* Beat 4: the couple's dashboard, live */}
            <div className="scr s4 dash">
              <p className="d-title">Dashboard</p>
              <div
                className="ev"
                style={{ "--from": "63%", "--to": "64%" } as CSSProperties}
              >
                <div className="ev-top">
                  <b>
                    {v.groom} &amp; {v.bride}
                  </b>
                  <span className="pill">PUBLISHED</span>
                </div>
                <small>
                  Classic tier, up to <span>100</span> guests
                </small>
                <div className="cap-row">
                  <span>Guests</span>
                  <span>
                    <span className="count">
                      <span>63</span>
                      <span>64</span>
                    </span>{" "}
                    / <span>100</span>
                  </span>
                </div>
                <div className="meter">
                  <i />
                </div>
              </div>
              <div className="tbl">
                <div className="tr th">
                  <span>Code</span>
                  <span>Name</span>
                  <span>Side</span>
                </div>
                <div className="tr new">
                  <span className="code">{v.guestCode}</span>
                  <span>
                    {v.guest.first} {v.guest.last}
                  </span>
                  <span>Groom</span>
                </div>
                <div className="tr">
                  <span className="code">B-{v.monogram}-049</span>
                  <span>Ngozi Eze</span>
                  <span>Bride</span>
                </div>
                <div className="tr">
                  <span className="code">G-{v.monogram}-013</span>
                  <span>Femi Adeyemi</span>
                  <span>Groom</span>
                </div>
                <div className="tr">
                  <span className="code">B-{v.monogram}-048</span>
                  <span>Halima Bello</span>
                  <span>Bride</span>
                </div>
              </div>
              <div className="d-actions">
                <span>Export CSV</span>
                <span>Share on WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="captions">
        <div className="steps" aria-hidden="true">
          <span className="bar b1">
            <i />
          </span>
          <span className="bar b2">
            <i />
          </span>
          <span className="bar b3">
            <i />
          </span>
          <span className="bar b4">
            <i />
          </span>
        </div>
        <div className="cap-stack">
          <p className="cap c1">Share one link on WhatsApp.</p>
          <p className="cap c2">Guests RSVP in seconds.</p>
          <p className="cap c3">Every guest gets a personal pass.</p>
          <p className="cap c4">See who&rsquo;s coming, live.</p>
        </div>
      </figcaption>
    </figure>
  );
}
