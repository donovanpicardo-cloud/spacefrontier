import { useState } from "react";

const jezeroSource =
  "https://science.nasa.gov/photojournal/possible-path-for-perseverance-rover/";
const marsTrek = "https://trek.nasa.gov/mars/";
const lettuceStudy = "https://osdr.nasa.gov/bio/repo/data/studies/OSD-267";
const foodToolkit =
  "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/";
const youthResources =
  "https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp";
const radLabSample =
  "https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-02T01%3A05&absorbed_dose_rate%3E2&flux&latitude&longitude&altitude&b&l&format=html";

// Consecutive DosTel1 rows from the linked RadLab result. Times are UTC.
const issReadings = [
  { time: "23:00:00", rate: 9.815504 },
  { time: "23:00:33", rate: 9.835079 },
  { time: "23:02:13", rate: 7.949537 },
  { time: "23:03:53", rate: 6.228811 },
  { time: "23:05:00", rate: 5.26644315384615 },
  { time: "23:05:33", rate: 5.935572 },
];

function ScienceLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function MarsRouteActivity() {
  const [route, setRoute] = useState<"rim" | "floor" | null>(null);
  return (
    <details className="science-note mission-science">
      <summary>Plan a rover route at Jezero Crater</summary>
      <figure>
        <a href={jezeroSource} target="_blank" rel="noreferrer">
          <img
            src="/plates/jezero-route.jpg"
            width="1200"
            height="653"
            loading="lazy"
            alt="NASA orbital mosaic showing a proposed Perseverance route from the delta up to Jezero’s crater rim."
          />
        </a>
        <figcaption>
          Proposed Perseverance traverse · NASA/JPL-Caltech
        </figcaption>
      </figure>
      <p>
        Your rover has little charge left. Stay on the crater floor or climb the
        rim for a wider survey?
      </p>
      <div className="mission-science-choices">
        <button
          className="secondary"
          aria-pressed={route === "floor"}
          onClick={() => setRoute("floor")}
        >
          Stay on the floor
        </button>
        <button
          className="secondary"
          aria-pressed={route === "rim"}
          onClick={() => setRoute("rim")}
        >
          Climb the rim
        </button>
      </div>
      <p aria-live="polite">
        {route === "floor" &&
          "Staying on the floor avoids the rim climb. Check for rough ground and leave enough charge for the return trip."}
        {route === "rim" &&
          "The rim gives you a wider survey, but the route climbs about 610 metres. With low charge, scout the grades and save the climb for a better supplied trip."}
      </p>
      <p>Use the outpost survey below to choose a supply trail in the game.</p>
      <ScienceLink href={jezeroSource}>NASA · Proposed rover route</ScienceLink>
      <ScienceLink href={marsTrek}>
        NASA Mars Trek · Explore the real terrain
      </ScienceLink>
    </details>
  );
}

export function GreenhouseResearch() {
  return (
    <details className="science-note mission-science">
      <summary>Crop research · Red romaine lettuce</summary>
      <p>
        NASA’s Veggie experiment compared red romaine grown on the International
        Space Station with lettuce grown on Earth. In your greenhouse, keep
        irrigation and grow lights running to bring the next harvest closer. The
        game sets the growth rate and food reward.
      </p>
      <p>
        Classroom challenge: If the battery runs low before harvest, what would
        you switch off first? Explain how your choice affects the crew today and
        their food supply later.
      </p>
      <ScienceLink href={lettuceStudy}>
        NASA Open Science Data Repository · OSD-267
      </ScienceLink>
      <ScienceLink href={foodToolkit}>
        Canadian Space Agency · Space food toolkit
      </ScienceLink>
      <ScienceLink href={youthResources}>
        Canadian Space Agency · Youth STEM activities
      </ScienceLink>
    </details>
  );
}

export function RadiationReadings({ exposure }: { exposure: number }) {
  return (
    <details className="science-note mission-science">
      <summary>Compare real ISS radiation readings</summary>
      <p>
        The ISS instrument DosTel1 recorded these absorbed dose rates on 1 April
        2022. Notice how the rate changes over just a few minutes.
      </p>
      <div
        className="radiation-chart"
        aria-label="ISS absorbed dose rate in micrograys per hour"
      >
        {issReadings.map(({ time, rate }) => (
          <div key={time} className="radiation-reading">
            <span>{time} UTC</span>
            <meter
              min={0}
              max={12}
              value={rate}
              aria-label={`Absorbed dose rate at ${time} UTC`}
            />
            <strong>{rate.toFixed(2)} µGy/h</strong>
          </div>
        ))}
      </div>
      <p>
        Your mission exposure index was <strong>{exposure.toFixed(2)}</strong>.
        The index uses game units. The ISS measurements come from Earth orbit on
        a different date from the archived solar storm.
      </p>
      <ScienceLink href={radLabSample}>
        NASA RadLab · Original ISS readings
      </ScienceLink>
    </details>
  );
}
