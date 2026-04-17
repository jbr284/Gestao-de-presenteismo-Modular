export const msalConfig = {
    auth: {
        // ID do aplicativo (cliente) que você enviou
        clientId: "1cd98e38-5f34-428c-9165-4a70cf27b853",
        
        // Link com o ID do diretório (locatário) que você enviou
        authority: "https://login.microsoftonline.com/63123b37-50ce-444c-80fa-fe99d1bf9f46",
        
        // O link oficial do seu PWA no GitHub Pages
        redirectUri: "https://jbr284.github.io/PESQUISA-DE-CORTES-LASER_SERRA/",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

export const loginRequest = {
    scopes: ["User.Read", "Files.Read.All", "Sites.Read.All"]
};
