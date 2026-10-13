const tagMatch = window.location.pathname.match(/^\/t\/([\w-]+)/i);

if (tagMatch) {
  import('./tag.js').then(({ bootTagPage }) => bootTagPage(tagMatch[1]));
} else {
  import('./app.js');
}
