// This file includes configuration for the Quill Rich text editor used on "SessionEditor.jsx"

import Quill from 'quill';
import 'react-quill-new/dist/quill.snow.css';

// ---- [1] Font Whitelisting Example (optional) ----
const Font = Quill.import('formats/font');
Font.whitelist = [
  'sans-serif',
  'serif',
  'monospace',
  'arial',
  'comic-sans',
  'roboto',
];
Quill.register(Font, true);

// ---- [2] Custom Image Blot ----
const BaseImage = Quill.import('formats/image');
class CustomImage extends BaseImage {
  static create(value) {
    let node = super.create(value);
    if (typeof value === 'object') {
      if (value.url) node.setAttribute('src', this.sanitize(value.url));
      if (value.width) node.style.width = value.width;
      if (value.height) node.style.height = value.height;
    } else {
      node.setAttribute('src', this.sanitize(value));
    }
    return node;
  }
  static value(domNode) {
    return {
      url: domNode.getAttribute('src'),
      width: domNode.style.width || '',
      height: domNode.style.height || '',
    };
  }
}
CustomImage.blotName = 'image';
CustomImage.tagName = 'img';
Quill.register(CustomImage, true);

// ---- [3] Custom Video Blot ----
const BaseVideo = Quill.import('formats/video');
class CustomVideo extends BaseVideo {
  static create(value) {
    let node = super.create(value);
    if (typeof value === 'object') {
      if (value.url) node.setAttribute('src', this.sanitize(value.url));
      if (value.width) node.style.width = value.width;
      if (value.height) node.style.height = value.height;
    } else {
      node.setAttribute('src', this.sanitize(value));
    }
    node.setAttribute('frameborder', '0');
    node.setAttribute('allowfullscreen', true);
    return node;
  }
  static value(domNode) {
    return {
      url: domNode.getAttribute('src'),
      width: domNode.style.width || '',
      height: domNode.style.height || '',
    };
  }
}
CustomVideo.blotName = 'video';
CustomVideo.tagName = 'iframe';
Quill.register(CustomVideo, true);

// ---- [4] Optional: Custom Toolbar Handlers ----
const customVideoHandler = function () {
  const range = this.quill.getSelection();
  let url = prompt('Enter the video URL');
  if (!url) return;
  // Example transform of YouTube watch to embed:
  if (url.includes('watch?v=')) {
    url = url.replace('watch?v=', 'embed/');
  }
  const width = prompt('Video width px?', '600');
  const height = prompt('Video height px?', '400');
  this.quill.insertEmbed(range.index, 'video', {
    url,
    width: width + 'px',
    height: height + 'px',
  }, 'user');
  this.quill.setSelection(range.index + 1, 0);
};

const customImageHandler = function () {
  const range = this.quill.getSelection();
  let url = prompt('Enter image URL');
  if (!url) return;
  const width = prompt('Image width px?', '600');
  const height = prompt('Image height px?', '400');
  this.quill.insertEmbed(range.index, 'image', {
    url,
    width: width + 'px',
    height: height + 'px',
  }, 'user');
  this.quill.setSelection(range.index + 1, 0);
};

// ---- [5] Modules Configuration ----
export const quillModules = {
  toolbar: {
    container: '#quill-toolbar', // or your custom toolbar ID
    handlers: {
      video: customVideoHandler,
      image: customImageHandler,
    },
  },
};


// (Optional) A common "formats" array. Quill uses this to
// whitelist which formats are allowed in the final content:
export const quillFormats = [
  'header',
  'font',
  'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script', 'blockquote', 'code-block',
  'list', 'indent',
  'link', 'image', 'video',
  // ... etc.
];