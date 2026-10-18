// Tema antes da primeira pintura: escuro por padrão; claro só se a pessoa escolheu no app.
// Fica em arquivo próprio porque a política de segurança (CSP) do servidor não aceita script embutido.
try {
  var s = JSON.parse(localStorage.getItem("mais1km-eunapolis:v4"));
  if (s && s.themeChosen === true && s.theme === "light") document.documentElement.dataset.theme = "light";
} catch (e) {}
