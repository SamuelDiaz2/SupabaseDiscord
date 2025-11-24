import { supabase } from './supabase.js';

// --- ESTADO GLOBAL BÁSICO DEL CHAT ---
let selectedServerId = null;
let selectedServerName = null; // Guardamos el nombre para la UI
let selectedChannelId = null;
let currentSubscription = null; // Para manejar la suscripción de Supabase a los mensajes

/**
 * Muestra la interfaz principal del Chat/Actividades (MVP).
 */
export async function mostrarChatMVP() {
    const app = document.getElementById("app");
    if (!app) {
        console.error("Contenedor de app no encontrado.");
        return;
    }

    // 1. Obtener usuario (Autosuficiencia)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        app.innerHTML = `<div class="p-8 text-center text-red-500 mt-20">Debes iniciar sesión para ver las actividades.</div>`;
        window.location.hash = '#login';
        window.dispatchEvent(new Event('hashchange'));
        return;
    }

    // 2. Renderizar la estructura base del chat
    app.innerHTML = `
        <div id="chat-layout" class="flex h-screen pt-16 bg-gray-100">
            <!-- Columna de Servidores (Server Sidebar) -->
            <aside id="server-sidebar" class="w-16 flex flex-col items-center bg-gray-900 overflow-y-auto p-2 space-y-2 shadow-lg">
                <div class="text-white text-xs text-center p-1">SERVIDORES</div>
                <!-- Los servidores se renderizarán aquí -->
            </aside>
            
            <!-- Columna de Canales (Channel Sidebar) -->
            <aside id="channel-sidebar" class="w-64 bg-gray-800 flex flex-col overflow-y-auto shadow-xl">
                <header class="p-4 border-b border-gray-700 bg-gray-700 text-white font-bold text-lg">
                    <span id="current-server-name">Selecciona un Servidor</span>
                </header>
                <div id="channels-list" class="flex-grow p-2 space-y-1">
                    <!-- Los canales se renderizarán aquí -->
                </div>
            </aside>

            <!-- Área de Mensajes (Main Chat Area) -->
            <main id="main-chat-area" class="flex-grow flex flex-col bg-white">
                <header class="p-3 border-b border-gray-200 bg-gray-50 flex items-center shadow-sm">
                    <span id="current-channel-name" class="text-xl font-semibold text-gray-700"># Bienvenida</span>
                    <span id="channel-type-icon" class="ml-2 text-gray-500"></span>
                </header>
                
                <div id="messages-container" class="flex-grow overflow-y-auto p-4 space-y-4">
                    <!-- Los mensajes se renderizarán aquí -->
                    <p class="text-center text-gray-500">Selecciona un canal para empezar a chatear.</p>
                </div>
                
                <footer class="p-4 border-t border-gray-200 bg-gray-50">
                    <form id="message-form" class="flex">
                        <input 
                            type="text" 
                            id="message-input" 
                            placeholder="Escribe tu mensaje aquí..."
                            class="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
                            disabled
                        >
                        <button 
                            type="submit" 
                            id="send-message-btn"
                            class="px-4 bg-indigo-600 text-white font-semibold rounded-r-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400"
                            disabled
                        >
                            Enviar
                        </button>
                    </form>
                </footer>
            </main>
        </div>
    `;

    // Iniciar la carga de servidores
    fetchAndRenderServers(user.id);
}

// ----------------------------------------------------------------
// FUNCIÓN PARA SELECCIONAR SERVIDOR (SIN PARÁMETROS)
// ----------------------------------------------------------------

/**
 * Función central para cambiar de servidor.
 * Lee el ID del servidor directamente del atributo data-server-id del botón.
 * @param {HTMLElement} element El elemento del botón que fue clickeado (this).
 */
window.seleccionarServidor = async function(element) {
    const serverId = element.getAttribute('data-server-id');
    const serverName = element.getAttribute('data-server-name');

    if (!serverId || selectedServerId === serverId) return; // Ya estamos en este servidor o falta el ID

    // 1. Actualizar estado
    selectedServerId = serverId;
    selectedServerName = serverName;
    selectedChannelId = null; // Reiniciar canal al cambiar de servidor
    
    // 2. Actualizar UI de servidor activo
    document.querySelectorAll('.server-icon-btn').forEach(btn => {
        btn.classList.remove('ring-4', 'ring-indigo-500');
    });
    element.classList.add('ring-4', 'ring-indigo-500');

    // 3. Actualizar nombres en la cabecera
    document.getElementById("current-server-name").textContent = selectedServerName;
    document.getElementById("current-channel-name").textContent = "# Selecciona un canal";
    document.getElementById("messages-container").innerHTML = `<p class="text-center text-gray-500 mt-8">Cargando canales para ${selectedServerName}...</p>`;
    
    // 4. Deshabilitar inputs
    document.getElementById('message-input').disabled = true;
    document.getElementById('send-message-btn').disabled = true;

    // 5. Cargar canales del nuevo servidor
    await fetchAndRenderChannels(selectedServerId);
}

// ----------------------------------------------------------------
// FUNCIONES DE CARGA DE DATOS
// ----------------------------------------------------------------

/**
 * Obtiene y renderiza la lista de servidores.
 * @param {string} userId El ID del usuario actual.
 */
async function fetchAndRenderServers(userId) {
    const serverSidebar = document.getElementById("server-sidebar");
    
    // Por simplicidad, obtenemos todos los servidores.
    // En una app real, usarías RLS de Supabase para obtener solo los del usuario.
    const { data: servers, error } = await supabase
        .from('servers')
        .select('server_id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching servers:', error);
        serverSidebar.innerHTML = `<p class="text-red-400 text-xs mt-4">Error</p>`;
        return;
    }
    
    serverSidebar.innerHTML = `
        <div class="text-white text-xs text-center p-1 font-bold">SERVIDORES</div>
        ${servers.map(server => `
            <button 
                id="server-btn-${server.server_id}"
                class="server-icon-btn w-12 h-12 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg"
                title="${server.name}"
                data-server-id="${server.server_id}"
                data-server-name="${server.name}"
                onclick="seleccionarServidor(this)"
            >
                ${server.name.substring(0, 2).toUpperCase()}
            </button>
        `).join('')}
    `;

    // Seleccionar automáticamente el primer servidor si existe
    if (servers.length > 0) {
        // Enviar el elemento DOM simulado para la carga inicial
        const firstServerBtn = document.getElementById(`server-btn-${servers[0].servers_id}`);
        if (firstServerBtn) {
            window.seleccionarServidor(firstServerBtn);
        }
    }
}

/**
 * Obtiene y renderiza la lista de canales para el servidor seleccionado.
 * @param {string} serverId El ID del servidor.
 */
async function fetchAndRenderChannels(serverId) {
    const channelsList = document.getElementById("channels-list");
    channelsList.innerHTML = `<p class="text-gray-400 p-2">Buscando canales...</p>`;

    const { data: channels, error } = await supabase
        .from('channels')
        .select('channel_id, name, channel_type')
        .eq('server_id', serverId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching channels:', error);
        channelsList.innerHTML = `<p class="text-red-400 p-2">Error al cargar canales.</p>`;
        return;
    }
    
    if (channels.length === 0) {
        channelsList.innerHTML = `<p class="text-gray-400 p-2">No hay canales en este servidor.</p>`;
        return;
    }

    channelsList.innerHTML = `
        ${channels.map(channel => `
            <button 
                id="channel-btn-${channel.channel_id}"
                class="channel-btn w-full text-left p-2 rounded-lg text-gray-300 hover:bg-gray-700 transition duration-150"
                data-channel-id="${channel.channel_id}"
                data-channel-name="${channel.name}"
                data-channel-type="${channel.channel_type}"
                onclick="seleccionarCanal(this)"
            >
                ${channel.channel_type === 'text' ? '<span class="mr-2">#</span>' : '<span class="mr-2">🔊</span>'}
                ${channel.name}
            </button>
        `).join('')}
    `;

    // Seleccionar automáticamente el primer canal
    if (channels.length > 0) {
        const firstChannelBtn = document.getElementById(`channel-btn-${channels[0].channel_id}`);
        if (firstChannelBtn) {
            window.seleccionarCanal(firstChannelBtn);
        }
    }
}


/**
 * Función central para cambiar de canal (sin parámetros).
 * Lee el ID del canal directamente del atributo data-channel-id del botón.
 * @param {HTMLElement} element El elemento del botón que fue clickeado (this).
 */
window.seleccionarCanal = function(element) {
    const channelId = element.getAttribute('data-channel-id');
    const channelName = element.getAttribute('data-channel-name');
    const channelType = element.getAttribute('data-channel-type');

    if (!channelId || selectedChannelId === channelId) return;

    // 1. Actualizar estado
    selectedChannelId = channelId;

    // 2. Actualizar UI de canal activo
    document.querySelectorAll('.channel-btn').forEach(btn => {
        btn.classList.remove('bg-gray-600', 'text-white');
    });
    element.classList.add('bg-gray-600', 'text-white');
    
    // 3. Actualizar cabecera del chat
    document.getElementById("current-channel-name").textContent = `# ${channelName}`;
    document.getElementById("channel-type-icon").innerHTML = channelType === 'text' ? '' : '🔊';

    // 4. Habilitar inputs
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-message-btn').disabled = false;
    document.getElementById('message-input').focus();
    
    // 5. Cargar mensajes (Placeholder)
    document.getElementById("messages-container").innerHTML = `
        <div class="text-center text-gray-500 p-8">
            <h3 class="text-lg font-semibold">Canal seleccionado: #${channelName}</h3>
            <p>Aquí se cargarán y se enviarán los mensajes.</p>
            <p>Servidor ID: ${selectedServerId} | Canal ID: ${selectedChannelId}</p>
        </div>
    `;

    // Aquí iría la lógica para *subscribirse* y *cargar* mensajes
    console.log(`Cambiando a Canal: ${channelName} (ID: ${channelId})`);
}

// ----------------------------------------------------------------
// ESCUCHA DEL FORMULARIO DE MENSAJES
// ----------------------------------------------------------------
document.addEventListener('submit', async function(e) {
    if (e.target && e.target.id === 'message-form') {
        e.preventDefault();
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();

        if (content && selectedChannelId) {

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
            .from('messages')
            .insert({
                channel_id: selectedChannelId,
                user_id: user.id,
                content: content
            });

            if (error) {
                console.error("Error insertando mensaje:", error);
                return;
            }

            messageInput.value = '';
    }
    }
});