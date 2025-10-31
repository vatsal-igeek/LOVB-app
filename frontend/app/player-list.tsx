import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Player, useTeam } from '../contexts/TeamContext';
import { Ionicons } from '@expo/vector-icons';

export default function PlayerList() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { setPlayerToPosition, lineup } = useTeam();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState(params.position as string || '');
  const [sortBy, setSortBy] = useState('name');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [players, search, filterPosition, sortBy]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/players`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...players];

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.teamName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Position filter
    if (filterPosition) {
      const posMap: Record<string, string> = {
        setter: 'S',
        outsideHitter: 'OH',
        oppositeHitter: 'OPP',
        middleBlocker: 'MB',
        libero: 'L',
        defensiveSpecialist: 'DS',
      };
      const abbr = posMap[filterPosition] || filterPosition;
      filtered = filtered.filter((p) => p.position === abbr);
    }

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'creditCost') {
      // Sort by credit cost: highest to lowest
      filtered.sort((a, b) => b.creditCost - a.creditCost);
    }

    setFilteredPlayers(filtered);
  };

  const handleSelectPlayer = (player: Player) => {
    if (params.position) {
      // Calculate the cost of adding this player
      const currentPlayer = lineup[params.position as keyof typeof lineup];
      let currentCost = 0;
      
      // If there's already a player in this position, we'll get their cost back
      if (currentPlayer && typeof currentPlayer === 'object' && 'creditCost' in currentPlayer) {
        currentCost = currentPlayer.creditCost;
      }
      
      // Calculate what the new total would be
      const newTotal = lineup.creditsUsed - currentCost + player.creditCost;
      
      // Check if the new total exceeds the budget
      if (newTotal > 100) {
        const availableCredits = 100 - (lineup.creditsUsed - currentCost);
        Alert.alert(
          'Budget Exceeded',
          `You don't have enough credits to select this player.\n\nPlayer Cost: ${player.creditCost} credits\nAvailable Credits: ${availableCredits} credits\n\nPlease select a cheaper player or remove other players to free up credits.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      setPlayerToPosition(params.position as any, player);
      router.back();
    } else {
      setSelectedPlayer(player);
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const isSelected = Object.values(lineup).some(
      (p) => p && typeof p === 'object' && 'id' in p && p.id === item.id
    );

    return (
      <TouchableOpacity
        style={[styles.playerCard, isSelected && styles.playerCardSelected]}
        onPress={() => handleSelectPlayer(item)}
        disabled={isSelected && !params.position}
      >
        {item.imageBase64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }}
            style={styles.playerImage}
          />
        ) : (
          <View style={[styles.playerImage, styles.imagePlaceholder]}>
            <Ionicons name="person" size={32} color="#64748B" />
          </View>
        )}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.name}</Text>
          <Text style={styles.playerTeam}>{item.teamName}</Text>
          <View style={styles.playerMeta}>
            <View style={styles.positionTag}>
              <Text style={styles.positionTagText}>{item.position}</Text>
            </View>
            <Text style={styles.playerJersey}>#{item.jerseyNumber}</Text>
          </View>
        </View>
        <View style={styles.playerRight}>
          <View style={styles.creditBadge}>
            <Text style={styles.creditValue}>{item.creditCost}</Text>
            <Text style={styles.creditLabel}>credits</Text>
          </View>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.position ? `Select ${params.abbr}` : 'All Players'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search players or teams..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !filterPosition && styles.filterButtonActive]}
          onPress={() => setFilterPosition('')}
        >
          <Text style={[styles.filterText, !filterPosition && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {['S', 'OH', 'OPP', 'MB', 'L', 'DS'].map((pos) => (
          <TouchableOpacity
            key={pos}
            style={[styles.filterButton, filterPosition === pos && styles.filterButtonActive]}
            onPress={() => setFilterPosition(pos)}
          >
            <Text style={[styles.filterText, filterPosition === pos && styles.filterTextActive]}>
              {pos}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
          onPress={() => setSortBy('name')}
        >
          <Text style={[styles.sortText, sortBy === 'name' && styles.sortTextActive]}>Name</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'creditCost' && styles.sortButtonActive]}
          onPress={() => setSortBy('creditCost')}
        >
          <Text style={[styles.sortText, sortBy === 'creditCost' && styles.sortTextActive]}>
            Credit Cost
          </Text>
        </TouchableOpacity>
      </View>

      {/* Player List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <FlatList
          data={filteredPlayers}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#64748B" />
              <Text style={styles.emptyText}>No players found</Text>
            </View>
          }
        />
      )}

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <Modal visible={!!selectedPlayer} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedPlayer(null)}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              {selectedPlayer.imageBase64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${selectedPlayer.imageBase64}` }}
                  style={styles.modalImage}
                />
              ) : (
                <View style={[styles.modalImage, styles.imagePlaceholder]}>
                  <Ionicons name="person" size={64} color="#64748B" />
                </View>
              )}

              <Text style={styles.modalName}>{selectedPlayer.name}</Text>
              <View style={styles.modalMeta}>
                <Text style={styles.modalPosition}>{selectedPlayer.position}</Text>
                <Text style={styles.modalJersey}>#{selectedPlayer.jerseyNumber}</Text>
                <Text style={styles.modalTeam}>{selectedPlayer.teamName}</Text>
              </View>

              <Text style={styles.modalBio}>{selectedPlayer.bio}</Text>

              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Career Stats</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedPlayer.stats.matches}</Text>
                    <Text style={styles.statLabel}>Matches</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedPlayer.stats.sets}</Text>
                    <Text style={styles.statLabel}>Sets</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedPlayer.stats.kills_per_set}</Text>
                    <Text style={styles.statLabel}>Kills/Set</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedPlayer.stats.digs_per_set}</Text>
                    <Text style={styles.statLabel}>Digs/Set</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedPlayer.stats.blocks_per_set}</Text>
                    <Text style={styles.statLabel}>Blocks/Set</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedPlayer.stats.aces_per_set}</Text>
                    <Text style={styles.statLabel}>Aces/Set</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalCreditBadge}>
                <Text style={styles.modalCreditValue}>{selectedPlayer.creditCost}</Text>
                <Text style={styles.modalCreditLabel}>CREDITS</Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  filterText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  sortButtonActive: {
    backgroundColor: '#334155',
  },
  sortText: {
    fontSize: 13,
    color: '#64748B',
  },
  sortTextActive: {
    color: '#60A5FA',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  playerCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerCardSelected: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  playerImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playerTeam: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionTag: {
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  positionTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  playerJersey: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: 'bold',
  },
  playerRight: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  creditBadge: {
    backgroundColor: '#0A0E27',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F97316',
    alignItems: 'center',
  },
  creditValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
  },
  creditLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  selectedBadge: {
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#334155',
    marginBottom: 16,
  },
  modalName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  modalPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F97316',
  },
  modalJersey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  modalTeam: {
    fontSize: 16,
    color: '#94A3B8',
  },
  modalBio: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#0A0E27',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F97316',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modalCreditBadge: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCreditValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCreditLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
