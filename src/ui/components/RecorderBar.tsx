/**
 * RecorderBar — start/stopp sensoropptak, del siste sesjonsfil og
 * vis liste over tidligere opptak i sandboxen.
 *
 * Brukes i Iter 2 for å samle datagrunnlag for justering av audio-mapping
 * i Iter 3.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import * as recorder from '../../sensors/recorder';

const KEEP_AWAKE_TAG = 'bridge-recorder';

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtTimestamp(ms: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0, 5)}`;
}

export default function RecorderBar({ embedded = false }: { embedded?: boolean }) {
  const [stats, setStats] = useState(recorder.getStats());
  const [past, setPast] = useState<recorder.PastRecording[]>([]);
  const [expanded, setExpanded] = useState(false);
  const lastFileRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPast = () => {
    try {
      setPast(recorder.listPastRecordings());
    } catch (e) {
      console.warn('[recorder-ui] list feilet:', e);
    }
  };

  useEffect(() => {
    refreshPast();
    const unsub = recorder.subscribe(() => {
      setStats(recorder.getStats());
      refreshPast();
    });
    return () => {
      unsub();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  useEffect(() => {
    if (stats.recording && !tickRef.current) {
      tickRef.current = setInterval(() => setStats(recorder.getStats()), 1000);
    }
    if (!stats.recording && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [stats.recording]);

  const onToggle = async () => {
    if (stats.recording) {
      const result = recorder.stop();
      if (result) lastFileRef.current = result.uri;
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } else {
      recorder.start();
      lastFileRef.current = null;
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    }
  };

  const onShare = async (uri: string) => {
    await recorder.shareLastFile(uri);
  };

  const onDelete = (uri: string) => {
    if (recorder.deleteRecording(uri)) refreshPast();
  };

  return (
    <View style={[styles.wrapper, embedded && styles.wrapperEmbedded]}>
      <View style={styles.bar}>
        <Pressable
          onPress={onToggle}
          style={[styles.btn, stats.recording && styles.btnRecording]}
        >
          <View
            style={[
              styles.dot,
              stats.recording ? styles.dotRecording : styles.dotIdle,
            ]}
          />
          <Text
            style={[
              styles.btnText,
              stats.recording && styles.btnTextRecording,
            ]}
          >
            {stats.recording ? 'STOP REC' : 'RECORD'}
          </Text>
        </Pressable>

        <View style={styles.info}>
          {stats.recording ? (
            <>
              <Text style={styles.infoText}>{fmtDuration(stats.duration)}</Text>
              <Text style={styles.infoSub}>{stats.sampleCount} samples</Text>
            </>
          ) : (
            <Pressable
              onPress={() => setExpanded(!expanded)}
              style={styles.expandBtn}
            >
              <Text style={styles.expandText}>
                {past.length === 0
                  ? 'NO RECORDINGS'
                  : `${past.length} SESSION${past.length === 1 ? '' : 'S'} ${
                      expanded ? '▴' : '▾'
                    }`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {expanded && !stats.recording && past.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
          {past.map((r) => (
            <View key={r.uri} style={styles.listRow}>
              <View style={styles.listMeta}>
                <Text style={styles.listName} numberOfLines={1}>
                  {r.name.replace(/^session-/, '').replace(/\.json$/, '')}
                </Text>
                <Text style={styles.listSub}>
                  {fmtBytes(r.size)} · {fmtTimestamp(r.modifiedMs)}
                </Text>
              </View>
              <Pressable
                onPress={() => onShare(r.uri)}
                style={styles.listAction}
              >
                <Text style={styles.listActionText}>SHARE</Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(r.uri)}
                style={[styles.listAction, styles.listActionDanger]}
              >
                <Text style={[styles.listActionText, styles.listActionDangerText]}>DEL</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const C = {
  surface: '#0f1420',
  border: '#18222e',
  text: '#8aa0b8',
  sub: '#2e3f52',
  dim: '#18242e',
  rec: '#c83838',
  recDim: '#3a1414',
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  wrapperEmbedded: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  btnRecording: {
    borderColor: C.rec,
    backgroundColor: C.recDim,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotIdle: {
    backgroundColor: C.sub,
  },
  dotRecording: {
    backgroundColor: C.rec,
  },
  btnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.text,
  },
  btnTextRecording: {
    color: '#e0a8a8',
  },
  info: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: C.text,
  },
  infoSub: {
    fontSize: 10,
    color: C.sub,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  expandBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.dim,
  },
  expandText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: C.text,
  },
  list: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: C.dim,
  },
  listInner: {
    paddingVertical: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.dim,
  },
  listMeta: {
    flex: 1,
  },
  listName: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    color: C.text,
  },
  listSub: {
    fontSize: 9,
    color: C.sub,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  listAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.dim,
  },
  listActionDanger: {
    borderColor: '#3a1414',
  },
  listActionText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.text,
  },
  listActionDangerText: {
    color: '#a06868',
  },
});
