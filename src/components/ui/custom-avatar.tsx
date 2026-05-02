import React from 'react';
import ImageFallback, { ImageFallbackProps } from '../ImageFallback';

export interface AvatarProps extends ImageFallbackProps {}

export function Avatar(props: AvatarProps) {
  return <ImageFallback variant="avatar" {...props} />;
}

export default Avatar;
