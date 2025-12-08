// This file includes configuration for the Quill Rich text editor used on "SessionEditor.jsx"

import Quill from 'quill';
import 'react-quill-new/dist/quill.snow.css';

// ---- [1] Font Whitelisting Example (optional) ----
const Font = Quill.import('formats/font');
Font.whitelist = ['sans-serif', 'serif', 'monospace', 'arial', 'comic-sans', 'roboto'];
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

    // 'value' might be an object { url, width, height } or a string (URL only)
    let videoUrl;
    if (typeof value === 'object') {
      videoUrl = value.url;
    } else {
      videoUrl = value;
    }

    // 1) Ensure YouTube embed has ?autoplay=1&mute=1
    videoUrl = CustomVideo.appendAutoplayParams(videoUrl);

    // 2) Assign the final URL
    node.setAttribute('src', this.sanitize(videoUrl));

    // 3) Handle width/height if present
    if (typeof value === 'object') {
      if (value.width) node.style.width = value.width;
      if (value.height) node.style.height = value.height;
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

  /**
   * Appends ?autoplay=1&mute=1 (or &autoplay=1&mute=1) for YouTube embed URLs.
   * Adjust as needed for other providers.
   */
  static appendAutoplayParams(url) {
    // Only modify if it's a YouTube embed URL
    if (url.includes('youtube.com/embed/')) {
      // Define the extra parameters
      const extraParams = 'autoplay=1&mute=1&controls=0&modestbranding=1&iv_load_policy=3';
      // Check if URL already has query parameters
      const hasQuery = url.includes('?');
      return hasQuery ? `${url}&${extraParams}` : `${url}?${extraParams}`;
    }
    return url;
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
  this.quill.insertEmbed(
    range.index,
    'video',
    {
      url,
      width: width + 'px',
      height: height + 'px',
    },
    'user',
  );
  this.quill.setSelection(range.index + 1, 0);
};

const customImageHandler = function () {
  const range = this.quill.getSelection();
  let url = prompt('Enter image URL');
  if (!url) return;
  const width = prompt('Image width px?', '600');
  const height = prompt('Image height px?', '400');
  this.quill.insertEmbed(
    range.index,
    'image',
    {
      url,
      width: width + 'px',
      height: height + 'px',
    },
    'user',
  );
  this.quill.setSelection(range.index + 1, 0);
};

const removeVideoBackspace = {
  key: 'Backspace',
  collapsed: true,
  handler(range) {
    if (range.index === 0) return true; // no "left" to delete
    const [block] = this.quill.getLine(range.index - 1);

    if (block && block.statics.blotName === 'video') {
      this.quill.deleteText(range.index - 1, 1);
      return false;
    }
    return true;
  },
};

const removeVideoDelete = {
  key: 'Delete',
  collapsed: true,
  handler(range) {
    // If we're at the end of the editor, no action
    if (range.index >= this.quill.getLength()) return true;

    const [leaf] = this.quill.getLeaf(range.index);
    if (!leaf) return true; // Normal delete

    // 1) Check if *this* leaf is a video blot
    if (leaf.statics && leaf.statics.blotName === 'video') {
      this.quill.deleteText(range.index, 1);
      return false; // Stop propagation
    }

    // 2) Otherwise check if the parent is 'video'
    if (leaf.parent && leaf.parent.statics.blotName === 'video') {
      this.quill.deleteText(range.index, 1);
      return false;
    }

    return true; // let Quill handle normal delete
  },
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
  keyboard: {
    bindings: {
      removeVideoBackspace,
      removeVideoDelete,
    },
  },
};

// (Optional) A common "formats" array. Quill uses this to
// whitelist which formats are allowed in the final content:
export const quillFormats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'blockquote',
  'code-block',
  'list',
  'indent',
  'link',
  'image',
  'video',
  'align',
  // ... etc.
];
