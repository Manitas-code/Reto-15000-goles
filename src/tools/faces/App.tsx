import { useEffect, useRef, useState } from 'react';
import { players } from '../../data/players';
import { readJson, writeJson } from '../../shared/storage/json';
import { candidates } from './candidates';
import type { Candidate } from './state';
const names = players.map((p) => p.name);
const KEY = 'gd_caras_elegidas';
let facesPromise: Promise<Record<string, string>> | null = null;
export function App() {
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [chosen, setChosen] = useState(() =>
    readJson<Record<string, string>>(KEY, {}),
  );
  const [only, setOnly] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [list, setList] = useState<Candidate[] | null>(null);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const request = useRef(0);
  const cur = (n: string) => (n in chosen ? chosen[n] : faces[n]);
  useEffect(() => {
    let active = true;
    facesPromise ??= window.GD_faces(names);
    facesPromise.then((m) => {
      if (active) {
        setFaces(m);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
      request.current++;
    };
  }, []);
  async function openPick(n: string) {
    const token = ++request.current;
    setName(n);
    setList(null);
    const found = await candidates(n);
    if (token === request.current) setList(found);
  }
  function close() {
    request.current++;
    setName(null);
  }
  function choose(value: string | undefined) {
    if (!name) return;
    const next = { ...chosen };
    if (value === undefined) delete next[name];
    else next[name] = value;
    writeJson(KEY, next);
    setChosen(next);
    close();
  }
  async function copy() {
    const all: Record<string, string> = {};
    names.forEach((n) => {
      all[n] = cur(n) || '';
    });
    const text =
      'CARAS GOALDAY\nCAMBIADAS: ' +
      Object.keys(chosen).join(', ') +
      '\nFOTOS: ' +
      JSON.stringify(all);
    setOutput(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      requestAnimationFrame(() => {
        outputRef.current?.select();
        document.execCommand('copy');
      });
    }
  }
  useEffect(() => {
    if (output) outputRef.current?.select();
  }, [output]);
  return (
    <>
      <div className="top">
        <b>Revisar caras</b>
        <span id="st">
          {loaded
            ? `${Object.keys(chosen).length} cambiadas · ${names.filter((n) => !cur(n)).length} sin foto. Toca un jugador para elegir otra foto (por ejemplo, una de cuando jugaba).`
            : 'Cargando fotos…'}
        </span>
        <button className="g" id="bOnly" onClick={() => setOnly(!only)}>
          {only ? 'Ver todas' : 'Ver solo cambiadas / sin foto'}
        </button>
        <button id="bCopy" onClick={copy}>
          {copied ? 'Copiado ✔' : 'Copiar resultado para Claude'}
        </button>
      </div>
      <textarea
        id="out"
        readOnly
        ref={outputRef}
        value={output}
        style={output ? { display: 'block' } : undefined}
      />
      <div className="grid" id="grid">
        {loaded &&
          names
            .filter((n) => !(only && !(n in chosen) && cur(n)))
            .map((n) => (
              <div
                key={n}
                className={
                  'c' + (n in chosen ? ' chg' : '') + (cur(n) ? '' : ' none')
                }
                data-n={n}
                onClick={() => void openPick(n)}
              >
                <div className="ph">
                  {cur(n) ? (
                    <img src={cur(n)} loading="lazy" alt="" />
                  ) : (
                    'sin foto'
                  )}
                </div>
                <div className="n">{n}</div>
              </div>
            ))}
      </div>
      <div
        className="modal"
        id="modal"
        hidden={!name}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {name && (
          <div className="box">
            <h2>{name}</h2>
            {list === null ? (
              <p>Buscando fotos…</p>
            ) : (
              <>
                <p>
                  Toca la foto que quieras. Las que tienen año salen primero, de
                  más antigua a más nueva.
                </p>
                <div className="row">
                  <button className="g" id="mClose" onClick={close}>
                    Cerrar
                  </button>
                  {name in chosen && (
                    <button
                      className="g"
                      id="mUndo"
                      onClick={() => choose(undefined)}
                    >
                      Volver a la original
                    </button>
                  )}
                  <button className="g" id="mNone" onClick={() => choose('')}>
                    Sin foto (iniciales)
                  </button>
                </div>
                <div className="opts">
                  {list.length ? (
                    list.map((x, i) => (
                      <div
                        key={x.t}
                        className={'opt' + (x.u === cur(name) ? ' cur' : '')}
                        data-i={i}
                        onClick={() => choose(x.u)}
                      >
                        <img src={x.u} loading="lazy" alt="" />
                        <small>{(x.t.match(/(19|20)\d\d/) || [''])[0]}</small>
                      </div>
                    ))
                  ) : (
                    <p>No se han encontrado más fotos.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
