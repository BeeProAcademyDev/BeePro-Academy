import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
} from 'react-native';
import { Video } from 'expo';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * VideoBackground Component
 * Displays a fullscreen video background
 * Compatible with Expo SDK 32
 */
export default class VideoBackground extends Component {
  render() {
    // For web, we'll show a message since Expo SDK 32 video doesn't fully support web
    if (Platform.OS === 'web') {
      return (
        <View style={styles.container}>
          <View style={styles.webFallback}>
            <Text style={styles.webText}>Video background available on mobile</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Video
          source={require('./assets/hero-video.mp4')}
          rate={1.0}
          volume={0.0}
          isMuted={true}
          resizeMode="cover"
          shouldPlay
          isLooping
          style={styles.video}
        />
        
        {/* Platform indicators */}
        <View style={styles.platformContainer}>
          <View style={styles.platformBadge}>
            <Text style={styles.platformText}>📱 iOS</Text>
          </View>
          <View style={styles.platformBadge}>
            <Text style={styles.platformText}>🤖 Android</Text>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
  webFallback: {
    flex: 1,
    backgroundColor: '#000428',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webText: {
    color: '#ffffff',
    fontSize: 18,
    opacity: 0.5,
  },
  platformContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  platformText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});