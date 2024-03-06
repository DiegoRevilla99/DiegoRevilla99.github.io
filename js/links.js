var divLinkGithub = document.getElementById("githubIcon");
var divLinkLinkedin = document.getElementById("linkedinIcon");
var divLinkWhats = document.getElementById("whatsIcon");

divLinkGithub.addEventListener("click", function () {
  window.open("https://github.com/DiegoRevilla99", "_blank");
});

divLinkLinkedin.addEventListener("click", function () {
  window.open("https://www.linkedin.com/in/jos%C3%A9-antonio-diego-revilla-2b3841252/", "_blank");
});

divLinkWhats.addEventListener("click", function () {
  window.open(
    "https://api.whatsapp.com/send/?phone=529512406578&text&type=phone_number&app_absent=0",
    "_blank"
  );
});
