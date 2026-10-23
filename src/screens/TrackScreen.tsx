import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import type { OrderStatus, TrackData } from "../api/types";
import { useStore } from "../store/useStore";
import { RateInput, Stars, STATUS_LABEL } from "../components/Dash";

// Live order tracking, Zomato/Swiggy-style: the rider's marker moves from
// the restaurant to the customer's door on a real map, with an ETA and the
// driver's card. The position comes from the API (the backend/demo data
// interpolates it over the ride window) and refreshes every few seconds.

const pin = (html: string, cls: string) => L.divIcon({ className: `map-pin ${cls}`, html, iconSize: [36, 36], iconAnchor: [18, 18] });
const REST_PIN = pin('<i class="fa-solid fa-utensils"></i>', "rest");
const HOME_PIN = pin('<i class="fa-solid fa-house"></i>', "home");
const RIDER_PIN = pin('<i class="fa-solid fa-motorcycle"></i>', "rider");

const STEPS: OrderStatus[] = ["received", "preparing", "packing", "on_the_way", "delivered"];

function Recenter({ pos }: { pos: { lat: number; lng: number } | null }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (pos && first.current) { map.setView([pos.lat, pos.lng], 14); first.current = false; }
    else if (pos) { map.panTo([pos.lat, pos.lng]); }
  }, [pos, map]);
  return null;
}

export default function TrackScreen() {
  const orderId = useStore((s) => s.trackOrderId);
  const setView = useStore((s) => s.setView);
  const showToast = useStore((s) => s.showToast);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState("");
  const [stars, setStars] = useState(5);

  useEffect(() => {
    let stop = false;
    const load = () => api.track(orderId).then((d) => { if (!stop) setData(d); }).catch(() => setError("Could not load tracking"));
    load();
    const t = setInterval(() => { if (!stop) load(); }, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [orderId]);

  const rate = async () => {
    try { await api.rate(orderId, stars); showToast("Thanks for rating your driver"); setData(await api.track(orderId)); }
    catch (e) { showToast(e instanceof Error ? e.message : "Could not save the rating"); }
  };

  const stepIdx = data ? STEPS.indexOf(data.status) : 0;

  return (
    <main className="dash-wrap">
      <div className="dash-top">
        <button type="button" className="btn-dark dash-back" onClick={() => setView("profile")}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
        </button>
        <span className="demo-badge">{orderId}</span>
      </div>
      <h1 className="dash-title">Track your order</h1>
      {error && <p className="form-err" role="alert">{error}</p>}
      {!data && !error && <p className="dash-note">Loading…</p>}
      {data && (
        <>
          <ol className="track-steps">
            {STEPS.map((st, i) => (
              <li key={st} className={i < stepIdx ? "done" : i === stepIdx ? "now" : ""}>
                <span className="ts-dot"><i className={`fa-solid ${i < stepIdx ? "fa-check" : i === stepIdx ? "fa-circle-dot" : "fa-circle"}`} aria-hidden="true" /></span>
                <span>{STATUS_LABEL[st]}</span>
              </li>
            ))}
          </ol>

          <div className="track-grid">
            <section className="panel-card map-card">
              <div className="map-box">
                <MapContainer center={[data.restaurant.lat, data.restaurant.lng]} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[data.restaurant.lat, data.restaurant.lng]} icon={REST_PIN} />
                  <Marker position={[data.destination.lat, data.destination.lng]} icon={HOME_PIN} />
                  {data.rider && <Marker position={[data.rider.lat, data.rider.lng]} icon={RIDER_PIN} />}
                  <Recenter pos={data.rider || data.restaurant} />
                </MapContainer>
              </div>
              <p className="dash-note">{data.restaurant.name} → your address</p>
            </section>

            <section className="panel-card">
              <h3 className="panel-h">
                {data.status === "delivered" ? "Delivered" : data.status === "on_the_way" ? `Arriving in ~${data.etaMinutes} min` : STATUS_LABEL[data.status]}
              </h3>
              {data.status === "on_the_way" && <p className="dash-note">Your rider is on the way. The marker moves live.</p>}
              {data.status !== "on_the_way" && data.status !== "delivered" && <p className="dash-note">The rider will appear on the map once your order is packed and picked up.</p>}

              {data.driver ? (
                <div className="driver-card">
                  {data.driver.photoUrl
                    ? <img className="driver-photo" src={data.driver.photoUrl} alt="" />
                    : <span className="acc-initial-lg">{data.driver.name.charAt(0)}</span>}
                  <div>
                    <p className="acc-name">{data.driver.name}</p>
                    <p className="acc-mail">{data.driver.vehicle || "Delivery partner"}</p>
                    <p className="acc-mail"><Stars value={data.driver.ratingAvg} /> {data.driver.ratingAvg} · {data.driver.ratingCount} ratings</p>
                  </div>
                </div>
              ) : (
                <p className="dash-note">A driver will be assigned when your order is packed.</p>
              )}

              {data.status === "delivered" && (
                data.rating ? (
                  <p className="dash-note">You rated this delivery {"★".repeat(data.rating.stars)}</p>
                ) : (
                  <div className="or-rate">
                    <span>Rate your driver:</span>
                    <RateInput value={stars} onChange={setStars} />
                    <button type="button" className="btn-primary sm" onClick={rate}>Submit</button>
                  </div>
                )
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
