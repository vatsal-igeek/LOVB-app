import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Player, useTeam } from '../contexts/TeamContext';

type PositionKey = 'setter' | 'outsideHitter' | 'oppositeHitter' | 'middleBlocker' | 'libero' | 'defensiveSpecialist';

const POSITIONS = [
  { key: 'setter' as PositionKey, label: 'Setter', abbr: 'S' },
  { key: 'outsideHitter' as PositionKey, label: 'Outside Hitter', abbr: 'OH' },
  { key: 'oppositeHitter' as PositionKey, label: 'Opposite Hitter', abbr: 'OPP' },
  { key: 'middleBlocker' as PositionKey, label: 'Middle Blocker', abbr: 'MB' },
  { key: 'libero' as PositionKey, label: 'Libero', abbr: 'L' },
  { key: 'defensiveSpecialist' as PositionKey, label: 'Defensive Specialist', abbr: 'DS' },
];

export default function TeamBuilder() {
  const router = useRouter();
  const { user } = useAuth();
  const { lineup, setPlayerToPosition, saveLineup, saving } = useTeam();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const canSave = () => {
    const allFilled = POSITIONS.every(pos => lineup[pos.key] !== null);
    const withinBudget = lineup.remaining >= 0;
    return allFilled && withinBudget;
  };

  const handleSave = async () => {
    if (!canSave()) {
      if (lineup.remaining < 0) {
        Alert.alert('Budget Exceeded', `You're over budget by ${Math.abs(lineup.remaining)} credits!`);
      } else {
        Alert.alert('Incomplete Lineup', 'Please fill all 6 positions before saving.');
      }
      return;
    }

    try {
      await saveLineup();
      Alert.alert('Success', 'Your lineup has been saved!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save lineup');
    }
  };

  const handleSelectPosition = (position: PositionKey, abbr: string) => {
    router.push(`/player-list?position=${position}&abbr=${abbr}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Your Team</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Budget Display */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetLabel}>Credits Used</Text>
            <Text style={styles.budgetValue}>{lineup.creditsUsed}/100</Text>
          </View>
          <View style={[styles.budgetInfo, styles.budgetRemaining]}>
            <Text style={styles.budgetLabel}>Remaining</Text>
            <Text style={[styles.budgetValue, lineup.remaining < 0 && styles.overBudget]}>
              {lineup.remaining}
            </Text>
          </View>
        </View>

        {/* Court Diagram */}
        <View style={styles.courtContainer}>
          <Text style={styles.sectionTitle}>Court Formation</Text>
          <View style={styles.court}>
            <Text style={styles.courtLabel}>VOLLEYBALL COURT</Text>
            <View style={styles.courtGrid}>
              {/* Front row */}
              <View style={styles.courtRow}>
                {/* OH - Outside Hitter */}
                <View style={styles.courtPositionWrapper}>
                  <View style={styles.jersey}>
                    <View style={styles.jerseyTop}>
                      <View style={styles.jerseySleeve} />
                      <View style={styles.jerseyCollar} />
                      <View style={styles.jerseySleeve} />
                    </View>
                    <View style={styles.jerseyBody}>
                      {lineup.outsideHitter ? (
                        <Text style={styles.jerseyNumber}>{lineup.outsideHitter.jerseyNumber}</Text>
                      ) : (
                        <Text style={styles.jerseyLabel}>OH</Text>
                      )}
                    </View>
                  </View>
                </View>
                {/* MB - Middle Blocker */}
                <View style={styles.courtPositionWrapper}>
                  <View style={styles.jersey}>
                    <View style={styles.jerseyTop}>
                      <View style={styles.jerseySleeve} />
                      <View style={styles.jerseyCollar} />
                      <View style={styles.jerseySleeve} />
                    </View>
                    <View style={styles.jerseyBody}>
                      {lineup.middleBlocker ? (
                        <Text style={styles.jerseyNumber}>{lineup.middleBlocker.jerseyNumber}</Text>
                      ) : (
                        <Text style={styles.jerseyLabel}>MB</Text>
                      )}
                    </View>
                  </View>
                </View>
                {/* OPP - Opposite Hitter */}
                <View style={styles.courtPositionWrapper}>
                  <View style={styles.jersey}>
                    <View style={styles.jerseyTop}>
                      <View style={styles.jerseySleeve} />
                      <View style={styles.jerseyCollar} />
                      <View style={styles.jerseySleeve} />
                    </View>
                    <View style={styles.jerseyBody}>
                      {lineup.oppositeHitter ? (
                        <Text style={styles.jerseyNumber}>{lineup.oppositeHitter.jerseyNumber}</Text>
                      ) : (
                        <Text style={styles.jerseyLabel}>OPP</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
              {/* Back row */}
              <View style={styles.courtRow}>
                {/* L - Libero */}
                <View style={styles.courtPositionWrapper}>
                  <View style={styles.jersey}>
                    <View style={styles.jerseyTop}>
                      <View style={styles.jerseySleeve} />
                      <View style={styles.jerseyCollar} />
                      <View style={styles.jerseySleeve} />
                    </View>
                    <View style={styles.jerseyBody}>
                      {lineup.libero ? (
                        <Text style={styles.jerseyNumber}>{lineup.libero.jerseyNumber}</Text>
                      ) : (
                        <Text style={styles.jerseyLabel}>L</Text>
                      )}
                    </View>
                  </View>
                </View>
                {/* S - Setter */}
                <View style={styles.courtPositionWrapper}>
                  <View style={styles.jersey}>
                    <View style={styles.jerseyTop}>
                      <View style={styles.jerseySleeve} />
                      <View style={styles.jerseyCollar} />
                      <View style={styles.jerseySleeve} />
                    </View>
                    <View style={styles.jerseyBody}>
                      {lineup.setter ? (
                        <Text style={styles.jerseyNumber}>{lineup.setter.jerseyNumber}</Text>
                      ) : (
                        <Text style={styles.jerseyLabel}>S</Text>
                      )}
                    </View>
                  </View>
                </View>
                {/* DS - Defensive Specialist */}
                <View style={styles.courtPositionWrapper}>
                  <View style={styles.jersey}>
                    <View style={styles.jerseyTop}>
                      <View style={styles.jerseySleeve} />
                      <View style={styles.jerseyCollar} />
                      <View style={styles.jerseySleeve} />
                    </View>
                    <View style={styles.jerseyBody}>
                      {lineup.defensiveSpecialist ? (
                        <Text style={styles.jerseyNumber}>{lineup.defensiveSpecialist.jerseyNumber}</Text>
                      ) : (
                        <Text style={styles.jerseyLabel}>DS</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Position Slots */}
        <View style={styles.positionsContainer}>
          <Text style={styles.sectionTitle}>Select Your Players</Text>
          {POSITIONS.map((position) => (
            <TouchableOpacity
              key={position.key}
              style={styles.positionSlot}
              onPress={() => handleSelectPosition(position.key, position.abbr)}
            >
              <View style={styles.positionLeft}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionAbbr}>{position.abbr}</Text>
                </View>
                <View style={styles.positionInfo}>
                  <Text style={styles.positionLabel}>{position.label}</Text>
                  {lineup[position.key] ? (
                    <View style={styles.playerPreview}>
                      <Text style={styles.playerName}>{lineup[position.key]!.name}</Text>
                      <Text style={styles.playerTeam}>{lineup[position.key]!.teamName}</Text>
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>Tap to select</Text>
                  )}
                </View>
              </View>
              <View style={styles.positionRight}>
                {lineup[position.key] ? (
                  <>
                    <View style={styles.creditBadge}>
                      <Text style={styles.creditText}>{lineup[position.key]!.creditCost}</Text>
                    </View>
                    {lineup[position.key]!.imageBase64 ? (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${lineup[position.key]!.imageBase64}` }}
                        style={styles.playerAvatar}
                      />
                    ) : (
                      <View style={[styles.playerAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={24} color="#64748B" />
                      </View>
                    )}
                  </>
                ) : (
                  <Ionicons name="add-circle" size={32} color="#F97316" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reserve Button */}
        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => router.push('/player-list')}
        >
          <Ionicons name="list" size={24} color="#60A5FA" />
          <Text style={styles.reserveButtonText}>View All Players</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, !canSave() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Lineup</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

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
              {/* Player profile content would go here */}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  budgetCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  budgetInfo: {
    flex: 1,
    alignItems: 'center',
  },
  budgetRemaining: {
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  budgetValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F97316',
  },
  overBudget: {
    color: '#EF4444',
  },
  courtContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  court: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  courtLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
  },
  courtGrid: {
    gap: 16,
  },
  courtRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  courtPositionWrapper: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jersey: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  jerseyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 60,
    position: 'absolute',
    top: 0,
  },
  jerseySleeve: {
    width: 12,
    height: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#F97316',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  jerseyCollar: {
    width: 30,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F97316',
    marginHorizontal: 2,
  },
  jerseyBody: {
    width: 54,
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#F97316',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  jerseyNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F97316',
  },
  jerseyLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F97316',
  },
  courtPlayerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  positionDot: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F97316',
  },
  positionsContainer: {
    marginTop: 24,
  },
  positionSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  positionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionAbbr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  positionInfo: {
    flex: 1,
  },
  positionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playerPreview: {
    gap: 2,
  },
  playerName: {
    fontSize: 14,
    color: '#60A5FA',
  },
  playerTeam: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  positionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creditBadge: {
    backgroundColor: '#0A0E27',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  creditText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F97316',
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  reserveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 18,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalClose: {
    alignSelf: 'flex-end',
  },
});
