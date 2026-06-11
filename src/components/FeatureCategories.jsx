import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';

const EMOJIS = ['🥦','🐟','🍎','🥩','🧀','🍞','🌶️','🫒','🥚'];
const SCROLL_SPEED = 0.1; // px per ms — tweak for faster/slower
const CARD_WIDTH   = 90;
const CARD_GAP     = 14;
const ITEM_SIZE    = CARD_WIDTH + CARD_GAP;

export default function FeatureCategories({ categories, loading }) {
  const router     = useRouter();
  const listRef    = useRef(null);
  const offsetRef  = useRef(0);
  const rafRef     = useRef(null);
  const lastTsRef  = useRef(null);

  const realItems  = categories?.length > 0 ? categories : [];
  // Triple so the "jump" is never visible even on wide screens
  const items      = [...realItems, ...realItems, ...realItems];
  const LOOP_WIDTH = realItems.length * ITEM_SIZE;

  useEffect(() => {
    if (realItems.length === 0) return;

    // Start in the middle copy so we can scroll both directions without hitting an edge
    offsetRef.current = LOOP_WIDTH;
    listRef.current?.scrollToOffset({ offset: LOOP_WIDTH, animated: false });

    let animId;
    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const delta      = ts - lastTsRef.current;
      lastTsRef.current = ts;

      offsetRef.current += SCROLL_SPEED * delta;

      // When we drift past the second copy, silently snap back to the first copy
      if (offsetRef.current >= LOOP_WIDTH * 2) {
        offsetRef.current -= LOOP_WIDTH;
        listRef.current?.scrollToOffset({ offset: offsetRef.current, animated: false });
      } else {
        listRef.current?.scrollToOffset({ offset: offsetRef.current, animated: false });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    rafRef.current = animId;

    return () => cancelAnimationFrame(rafRef.current);
  }, [realItems.length, LOOP_WIDTH]);

  /* ── Skeleton ── */
  if (loading) return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.skelTitle} />
        <View style={styles.skelLink} />
      </View>
      <View style={styles.skelRow}>
        {[1,2,3,4].map(i => (
          <View key={i} style={styles.skelItem}>
            <View style={styles.skelCircle} />
            <View style={styles.skelLabel} />
          </View>
        ))}
      </View>
    </View>
  );

  /* ── Card ── */
  const renderItem = ({ item, index }) => {
    const img = item.thumbnail || item.image;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push(`/products?categoryId=${item.id}`)}
      >
        <View style={styles.circle}>
          {img
            ? <Image source={{ uri: img }} style={styles.img} resizeMode="contain" />
            : <Text style={styles.emoji}>{EMOJIS[index % EMOJIS.length]}</Text>
          }
        </View>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Featured Categories</Text>
        <TouchableOpacity onPress={() => router.push('/products')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}           // RAF is the only driver
        getItemLayout={(_, i) => ({
          length: ITEM_SIZE,
          offset: ITEM_SIZE * i,
          index: i,
        })}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        // Fade edges
        fadingEdgeLength={48}
        removeClippedSubviews={false}   // keep all clones mounted for seamless loop
        initialNumToRender={items.length}
        maxToRenderPerBatch={items.length}
        windowSize={21}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  header:  {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
    paddingHorizontal: 16,
  },
  title:   { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  viewAll: { fontSize: 13, color: '#2d9e2d', fontWeight: '600' },

  card:   { width: CARD_WIDTH, alignItems: 'center' },
  circle: {
    width: CARD_WIDTH, height: CARD_WIDTH,
    borderRadius: CARD_WIDTH / 2,
    backgroundColor: '#f4faf4',
    borderWidth: 1.5, borderColor: '#d6eed6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 7, overflow: 'hidden',
  },
  img:   { width: 56, height: 56 },
  emoji: { fontSize: 30 },
  name:  {
    fontSize: 11, fontWeight: '700',
    color: '#1a1a1a', textAlign: 'center', lineHeight: 15,
  },

  // Skeleton
  skelRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: CARD_GAP },
  skelItem:   { width: CARD_WIDTH, alignItems: 'center' },
  skelCircle: {
    width: CARD_WIDTH, height: CARD_WIDTH,
    borderRadius: CARD_WIDTH / 2, backgroundColor: '#efefef',
  },
  skelLabel:  { width: 58, height: 10, borderRadius: 5, backgroundColor: '#efefef', marginTop: 8 },
  skelTitle:  { width: 140, height: 14, borderRadius: 6, backgroundColor: '#efefef' },
  skelLink:   { width: 52, height: 12, borderRadius: 6, backgroundColor: '#efefef' },
});