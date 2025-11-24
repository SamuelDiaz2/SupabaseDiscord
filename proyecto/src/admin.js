import { supabase } from "./supabase.js";

// Variables globales para mantener las suscripciones activas
let usersSubscription = null;
let serversSubscription = null;
let channelsSubscription = null;
let messagesSubscription = null;

// =================================================================
// 1. Helpers
// =================================================================

/** Helper para escapar texto (seguridad básica HTML) */
function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Crea y devuelve un modal simple para confirmación (reemplaza confirm()).
 */
function createConfirmationModal(title, body, callback) {
    const modal = document.createElement('div');
    modal.id = 'confirmation-modal';
    modal.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300";
    modal.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full border border-gray-700">
            <h4 class="text-xl font-bold mb-4 text-red-400">${title}</h4>
            <p class="text-gray-300 mb-6">${body}</p>
            <div class="flex justify-end space-x-3">
                <button id="cancel-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">Cancelar</button>
                <button id="confirm-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition">Confirmar</button>
            </div>
        </div>
    `;

    modal.querySelector('#cancel-btn').addEventListener('click', () => {
        callback(false);
        modal.remove();
    });
    modal.querySelector('#confirm-btn').addEventListener('click', () => {
        callback(true);
        modal.remove();
    });
    document.body.appendChild(modal);
}

/**
 * Detiene todas las suscripciones de Supabase activas.
 */
function unsubscribeAll() {
    [usersSubscription, serversSubscription, channelsSubscription, messagesSubscription].forEach(sub => {
        if (sub) {
            supabase.removeChannel(sub);
        }
    });
    usersSubscription = serversSubscription = channelsSubscription = messagesSubscription = null;
}

// =================================================================
// 2. Renderizado de Componentes
// =================================================================

/**
 * Renderiza la lista de usuarios y adjunta listeners de borrado.
 * NOTA DE CORRECCIÓN: Se usa 'uid' en lugar de 'id' para la tabla de usuarios.
 */
function renderUsers(users, usersDiv, mensaje) {
    usersDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-3 text-indigo-400">👤 Usuarios (${users.length})</h3>
        ${
            users.length === 0
                ? "<p class='text-gray-400'>No hay usuarios registrados.</p>"
                : `<ul class="space-y-2 max-h-96 overflow-y-auto pr-2">
                    ${users
                        .map(
                            (u) => `
                            <li class="p-3 bg-gray-700 rounded-lg flex justify-between items-center text-sm">
                                <div>
                                    <strong>${escapeHtml(u.username)}</strong>
                                    <span>UID: ${escapeHtml(u.user_id.substring(0, 8))}...</span>
                                </div>
                                <button data-id="${u.user_id}">
                                    🗑️ Eliminar
                                </button>
                            </li>`
                        )
                        .join("")}
                </ul>`
        }
    `;

    document.querySelectorAll(".delete-user").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            createConfirmationModal("Eliminar Usuario", "¿Estás seguro de que quieres eliminar a este usuario?", async (confirmed) => {
                if (confirmed) {
                    // FIX: Cambiado .eq("id", id) a .eq("uid", id)
                    const { error } = await supabase.from("users").delete().eq("user_id", id); 
                    if (error) {
                        mensaje.textContent = "❌ Error eliminando usuario: " + error.message;
                        mensaje.className = "mt-4 text-center font-medium text-red-400";
                    } else {
                        mensaje.textContent = "✅ Usuario eliminado (Actualizado en tiempo real).";
                        mensaje.className = "mt-4 text-center font-medium text-green-400";
                        setTimeout(() => mensaje.textContent = "", 3000);
                    }
                }
            });
        });
    });
}

/**
 * Renderiza la lista de servidores y sus dueños.
 */
function renderServers(servers, serversDiv, mensaje) {
    serversDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-3 text-indigo-400">💻 Servidores (${servers.length})</h3>
        ${
            servers.length === 0
                ? "<p class='text-gray-400'>No hay servidores registrados.</p>"
                : `<ul class="space-y-2 max-h-96 overflow-y-auto pr-2">
                    ${servers
                        .map((s) => {
                            const owner = s.owner_id && s.owner_id.username ? escapeHtml(s.owner_id.username) : "Desconocido";
                            return `
                            <li class="p-3 bg-gray-700 rounded-lg flex justify-between items-center text-sm">
                                <div>
                                    <strong class="text-white">${escapeHtml(s.name)}</strong>
                                    <span class="text-xs text-gray-400 block">Dueño: ${owner}</span>
                                </div>
                                <button data-id="${s.server_id}" class="delete-server px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition duration-200 text-xs">
                                    🗑️ Eliminar
                                </button>
                            </li>`;
                        })
                        .join("")}
                </ul>`
        }
    `;
    
    document.querySelectorAll(".delete-server").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            createConfirmationModal("Eliminar Servidor", "¿Estás seguro de que quieres eliminar este servidor? (Se eliminarán sus canales y mensajes asociados).", async (confirmed) => {
                if (confirmed) {
                    const { error } = await supabase.from("servers").delete().eq("server_id", id);
                    if (error) {
                        mensaje.textContent = "❌ Error eliminando servidor: " + error.message;
                        mensaje.className = "mt-4 text-center font-medium text-red-400";
                    } else {
                        mensaje.textContent = "✅ Servidor eliminado (Actualizado en tiempo real).";
                        mensaje.className = "mt-4 text-center font-medium text-green-400";
                        setTimeout(() => mensaje.textContent = "", 3000);
                    }
                }
            });
        });
    });
}

/**
 * Renderiza la lista de canales y el servidor al que pertenecen.
 */
function renderChannels(channels, channelsDiv, mensaje) {
    channelsDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-3 text-indigo-400"># Canales (${channels.length})</h3>
        ${
            channels.length === 0
                ? "<p class='text-gray-400'>No hay canales registrados.</p>"
                : `<ul class="space-y-2 max-h-96 overflow-y-auto pr-2">
                    ${channels
                        .map((c) => {
                            // Usamos c.server_id si está asociado (JOIN)
                            const serverName = c.server_id && c.server_id.name ? escapeHtml(c.server_id.name) : "Sin Servidor";
                            return `
                            <li class="p-3 bg-gray-700 rounded-lg flex justify-between items-center text-sm">
                                <div>
                                    <strong class="text-white">${escapeHtml(c.name)}</strong>
                                    <span class="text-xs text-gray-400 block">Tipo: ${escapeHtml(c.type)} - Servidor: ${serverName}</span>
                                </div>
                                <button data-id="${c.id}" class="delete-channel px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition duration-200 text-xs">
                                    🗑️ Eliminar
                                </button>
                            </li>`;
                        })
                        .join("")}
                </ul>`
        }
    `;
    
    document.querySelectorAll(".delete-channel").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            createConfirmationModal("Eliminar Canal", "¿Estás seguro de que quieres eliminar este canal? (Se eliminarán sus mensajes asociados).", async (confirmed) => {
                if (confirmed) {
                    const { error } = await supabase.from("channels").delete().eq("id", id);
                    if (error) {
                        mensaje.textContent = "❌ Error eliminando canal: " + error.message;
                        mensaje.className = "mt-4 text-center font-medium text-red-400";
                    } else {
                        mensaje.textContent = "✅ Canal eliminado (Actualizado en tiempo real).";
                        mensaje.className = "mt-4 text-center font-medium text-green-400";
                        setTimeout(() => mensaje.textContent = "", 3000);
                    }
                }
            });
        });
    });
}

/**
 * Renderiza los 20 mensajes más recientes.
 */
function renderRecentMessages(messages, messagesDiv, mensaje) {
    messagesDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-3 text-indigo-400">💬 20 Mensajes Más Recientes</h3>
        ${
            messages.length === 0
                ? "<p class='text-gray-400'>No hay mensajes registrados.</p>"
                : `<ul class="space-y-2 max-h-96 overflow-y-auto pr-2">
                    ${messages
                        .map((m) => {
                            const username = m.user_id && m.user_id.username ? escapeHtml(m.user_id.username) : "Usuario Desconocido";
                            const channelName = m.channel_id && m.channel_id.name ? escapeHtml(m.channel_id.name) : "Canal Desconocido";
                            
                            // Formato de hora simple
                            const time = new Date(m.created_at).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
                            
                            return `
                            <li class="p-3 bg-gray-700 rounded-lg flex justify-between items-start text-sm border-l-4 border-purple-500">
                                <div class="flex-grow">
                                    <div class="text-xs text-gray-400 mb-1">
                                        <span class="font-bold text-purple-300">${time}</span> en #${channelName} por <span class="font-semibold text-white">${username}</span>
                                    </div>
                                    <p class="text-gray-200 break-words max-w-full">${escapeHtml(m.content)}</p>
                                </div>
                                <button data-id="${m.id}" class="delete-message ml-4 flex-shrink-0 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition duration-200 text-xs">
                                    🗑️ Borrar
                                </button>
                            </li>`;
                        })
                        .join("")}
                </ul>`
        }
    `;

    document.querySelectorAll(".delete-message").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            createConfirmationModal("Eliminar Mensaje", "¿Estás seguro de que quieres eliminar este mensaje?", async (confirmed) => {
                if (confirmed) {
                    const { error } = await supabase.from("messages").delete().eq("id", id);
                    if (error) {
                        mensaje.textContent = "❌ Error eliminando mensaje: " + error.message;
                        mensaje.className = "mt-4 text-center font-medium text-red-400";
                    } else {
                        mensaje.textContent = "✅ Mensaje eliminado (Actualizado en tiempo real).";
                        mensaje.className = "mt-4 text-center font-medium text-green-400";
                        setTimeout(() => mensaje.textContent = "", 3000);
                    }
                }
            });
        });
    });
}


// =================================================================
// 3. Función Principal (Exportada)
// =================================================================

/**
* Panel administrativo: muestra usuarios, servidores, canales y mensajes en tiempo real.
*/
export async function mostrarAdmin() {
    const app = document.getElementById("app");
    
    if (!app) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user.email !== "samuel.diazf@uniagustiniana.edu.co" == "sdiazfdez@outlook.com") {
        app.innerHTML = "<p>⛔ No tienes permisos para acceder a este panel.</p>";
    return;
    }

    // Detener suscripciones previas antes de redibujar
    unsubscribeAll(); 

    // --- Estructura inicial del panel (Grid 2x2) ---
    app.innerHTML = `
        <section>
            <h2>🛡️ Panel Administrativo de Chat (Tiempo Real)</h2>
            <p id="mensaje">Cargando datos...</p>

            <section id="panel" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div id="users-panel">
                    <p>Cargando usuarios...</p>
                </div>
                <div id="servers-panel">
                    <p>Cargando servidores...</p>
                </div>
                <div id="channels-panel">
                    <p>Cargando canales...</p>
                </div>
                <div id="messages-panel">
                    <p>Cargando mensajes recientes...</p>
                </div>
            </section>
        </section>
    `;

    const mensaje = document.getElementById("mensaje");
    const usersDiv = document.getElementById("users-panel");
    const serversDiv = document.getElementById("servers-panel");
    const channelsDiv = document.getElementById("channels-panel");
    const messagesDiv = document.getElementById("messages-panel");
    
    // =================================================================
    // Carga Inicial
    // =================================================================
    
    const { data: initialUsers, error: errorUsers } = await supabase
        .from("users")
        .select("user_id, username, email") 
        .order("username", { ascending: true });

    if (errorUsers) { usersDiv.innerHTML = `<p>Error cargando usuarios: ${errorUsers.message}</p>`; return; }
    let usersCache = initialUsers || [];
    renderUsers(usersCache, usersDiv, mensaje);
    
    // --- 2. SERVIDORES (JOIN con el dueño) ---
    const { data: initialServers, error: errorServers } = await supabase
        .from("servers")
        .select(`server_id, name, owner_id(username)`)
        .order("name", { ascending: true });

    if (errorServers) { serversDiv.innerHTML = `<p>Error cargando servidores: ${errorServers.message}</p>`; return; }
    let serversCache = initialServers || [];
    renderServers(serversCache, serversDiv, mensaje);
    
    // --- 3. CANALES (JOIN con el servidor) ---
    const { data: initialChannels, error: errorChannels } = await supabase
        .from("channels")
        .select(`channel_id, name, channel_type, server_id(name)`)
        .order("name", { ascending: true });

    if (errorChannels) { channelsDiv.innerHTML = `<p>Error cargando canales: ${errorChannels.message}</p>`; return; }
    let channelsCache = initialChannels || [];
    renderChannels(channelsCache, channelsDiv, mensaje);
    
    // --- 4. MENSAJES RECIENTES (JOIN con usuario y canal, LIMIT 20) ---
    const { data: initialMessages, error: errorMessages } = await supabase
        .from("messages")
        .select(`message_id, content, sent_at, user_id(username), channel_id(name)`)
        .order("sent_at", { ascending: false })
        .limit(20);

    if (errorMessages) { messagesDiv.innerHTML = `<p>Error cargando mensajes: ${errorMessages.message}</p>`; return; }
    let messagesCache = initialMessages || [];
    renderRecentMessages(messagesCache, messagesDiv, mensaje);


    // =================================================================
    // Suscripciones en Tiempo Real (REFETCH en caso de cambio)
    // =================================================================

    // 1. SUSCRIPCIÓN DE USUARIOS
    usersSubscription = supabase
        .channel('admin_users_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async payload => {
            // FIX: Solicitamos 'uid' en lugar de 'id'
            const { data: updatedUsers } = await supabase.from("users").select("user_id, username").order("username", { ascending: true });
            usersCache = updatedUsers || [];
            renderUsers(usersCache, usersDiv, mensaje);
            mensaje.textContent = `🔔 Un usuario fue ${payload.eventType === 'INSERT' ? 'agregado' : payload.eventType === 'DELETE' ? 'eliminado' : 'actualizado'}.`;
            setTimeout(() => mensaje.textContent = "✅ Panel listo. En tiempo real.", 3000); 
        })
        .subscribe();
        
    // 2. SUSCRIPCIÓN DE SERVIDORES
    serversSubscription = supabase
        .channel('admin_servers_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'servers' }, async payload => {
            const { data: updatedServers } = await supabase.from("servers").select(`server_id, name, owner_id(username)`).order("name", { ascending: true });
            serversCache = updatedServers || [];
            renderServers(serversCache, serversDiv, mensaje);
            mensaje.textContent = `🔔 Un servidor fue ${payload.eventType === 'INSERT' ? 'agregado' : payload.eventType === 'DELETE' ? 'eliminado' : 'actualizado'}.`;
            setTimeout(() => mensaje.textContent = "✅ Panel listo. En tiempo real.", 3000); 
        })
        .subscribe();
        
    // 3. SUSCRIPCIÓN DE CANALES
    channelsSubscription = supabase
        .channel('admin_channels_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, async payload => {
            const { data: updatedChannels } = await supabase.from("channels").select(`id, name, type, server_id(name)`).order("name", { ascending: true });
            channelsCache = updatedChannels || [];
            renderChannels(channelsCache, channelsDiv, mensaje);
            mensaje.textContent = `🔔 Un canal fue ${payload.eventType === 'INSERT' ? 'agregado' : payload.eventType === 'DELETE' ? 'eliminado' : 'actualizado'}.`;
            setTimeout(() => mensaje.textContent = "✅ Panel listo. En tiempo real.", 3000); 
        })
        .subscribe();
        
    // 4. SUSCRIPCIÓN DE MENSAJES (Siempre refetch para mantener el top 20)
    messagesSubscription = supabase
        .channel('admin_messages_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async payload => {
            const { data: updatedMessages } = await supabase.from("messages").select(`id, content, created_at, user_id(username), channel_id(name)`).order("created_at", { ascending: false }).limit(20);
            messagesCache = updatedMessages || [];
            renderRecentMessages(messagesCache, messagesDiv, mensaje);
            mensaje.textContent = `🔔 Un mensaje fue ${payload.eventType === 'INSERT' ? 'agregado' : payload.eventType === 'DELETE' ? 'eliminado' : 'actualizado'} (Top 20 actualizado).`;
            setTimeout(() => mensaje.textContent = "✅ Panel listo. En tiempo real.", 3000); 
        })
        .subscribe();
        
    // Mensaje final
    if (mensaje.textContent.includes("Cargando")) {
        mensaje.textContent = "✅ Panel listo. En tiempo real.";
    }
}