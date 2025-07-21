import { useRef, useState } from 'react';
import {
    Animated,
    Image,
    ImageStyle,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

interface ProgressiveImageProps {
  source: { uri: string };
  style?: ViewStyle | ImageStyle;
  blurRadius?: number;
  fadeDuration?: number;
  thumbnailSize?: number;
  onLoadEnd?: () => void;
  onError?: () => void;
}

export default function ProgressiveImage({
  source,
  style,
  blurRadius = 1.5,
  fadeDuration = 250,
  thumbnailSize = 150,
  onLoadEnd,
  onError,
}: ProgressiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const imageOpacity = useRef(new Animated.Value(0)).current;

  // Generate optimized URLs for mobile
  const getOptimizedUrl = (originalUrl: string, size: 'thumbnail' | 'full') => {
    if (originalUrl.includes('supabase')) {
      const separator = originalUrl.includes('?') ? '&' : '?';
      if (size === 'thumbnail') {
        return `${originalUrl}${separator}width=${thumbnailSize}&quality=30&format=webp`;
      } else {
        return `${originalUrl}${separator}width=600&quality=80&format=webp`;
      }
    }
    return originalUrl;
  };

  const thumbnailUrl = getOptimizedUrl(source.uri, 'thumbnail');
  const fullSizeUrl = getOptimizedUrl(source.uri, 'full');





  const handleImageLoad = () => {
    setImageLoaded(true);
    onLoadEnd?.();
    
    // Fade in full image
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();
  };

  const handleImageError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Blurred thumbnail - loads immediately */}
      {!hasError && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={[styles.image, styles.thumbnail]}
          blurRadius={blurRadius}
          onError={() => {}} // Ignore thumbnail errors
        />
      )}
      
      {/* Full resolution image */}
      {!hasError && (
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: imageOpacity,
            },
          ]}
        >
          <Image
            source={{ uri: fullSizeUrl }}
            style={styles.image}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
