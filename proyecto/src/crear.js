import { supabase } from "./supabase.js";

/**
 * Muestra el formulario para crear un nuevo servidor y canal.
 * La función ahora obtiene el usuario directamente de Supabase.
 */
export async function mostrarCrear() {
    const app = document.getElementById("app");
    
    if (!app) {
        console.error("No se encontró el contenedor de la app.");
        return;
    }

    // 1. Obtener el usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
        console.error("Error obteniendo el usuario:", authError.message);
    }

    // --- VALIDACIÓN DE SESIÓN INTERNA ---
    // Si NO hay usuario, redirigir y mostrar un mensaje de error.
    if (!user || !user.id) {
        app.innerHTML = `
            <div class="p-8 max-w-lg mx-auto bg-gray-900 rounded-xl shadow-2xl text-white mt-8 border border-red-700">
                <h2 class="text-3xl font-extrabold mb-4 text-center text-red-400">🚫 Acceso Denegado</h2>
                <p class="text-gray-400 text-center">Debes iniciar sesión para crear un nuevo servidor. Redirigiendo a Login...</p>
            </div>
        `;
        // Forzar redirección al login
        setTimeout(() => {
            window.location.hash = '#login';
            // Disparar el evento hashchange para que el router principal cargue la vista
            window.dispatchEvent(new Event('hashchange')); 
        }, 1500);
        return;
    }
    
    // Si el usuario existe, extraemos su ID.
    const ownerId = user.id;

    // 2. Renderizar el Formulario
    app.innerHTML = `
        <section class="p-4 md:p-8 max-w-lg mx-auto bg-gray-900 rounded-xl shadow-2xl text-white mt-8 border border-green-700">
            <h2 class="text-3xl font-extrabold mb-6 text-center text-green-400">➕ Crear Nuevo Servidor y Canal</h2>
            <p class="text-gray-400 text-center mb-6">Serás el dueño de este espacio. Tu ID de Supabase es: 
                <strong class="text-yellow-300 break-all">${ownerId}</strong>.
            </p>

            <form id="create-server-form" class="space-y-6">
                <!-- Nombre del Servidor -->
                <div>
                    <label for="server-name" class="block text-sm font-medium text-gray-300 mb-2">Nombre del Servidor</label>
                    <input 
                        type="text" 
                        id="server-name" 
                        required 
                        maxlength="50"
                        placeholder="Ej: Comunidad de Programación, Proyectos de la Clase"
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500 transition duration-150"
                    >
                </div>

                <!-- Nombre del Canal Inicial -->
                <div>
                    <label for="channel-name" class="block text-sm font-medium text-gray-300 mb-2">Nombre del Canal Inicial (General)</label>
                    <input 
                        type="text" 
                        id="channel-name" 
                        required 
                        maxlength="30"
                        value="general"
                        placeholder="Ej: general, anuncios, bienvenida"
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500 transition duration-150"
                    >
                    <p class="text-xs text-gray-500 mt-1">Este será el primer canal de texto de tu servidor.</p>
                </div>
                
                <!-- Tipo de Canal Inicial (siempre texto) -->
                <input type="hidden" id="channel-type" value="text">


                <button 
                    type="submit" 
                    id="submit-button"
                    class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50 disabled:bg-gray-500"
                >
                    🚀 Crear Servidor y Canal
                </button>
            </form>

            <p id="feedback-message" class="mt-4 text-center font-medium"></p>
        </section>
    `;

    const form = document.getElementById("create-server-form");
    const feedbackMessage = document.getElementById("feedback-message");
    const submitButton = document.getElementById("submit-button");

    // 3. Manejar el envío del formulario
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const serverName = document.getElementById("server-name").value.trim();
        const channelName = document.getElementById("channel-name").value.trim();
        const channelType = document.getElementById("channel-type").value;

        if (!serverName || !channelName) {
            feedbackMessage.textContent = "❌ Por favor, ingresa un nombre para el servidor y el canal.";
            feedbackMessage.className = "mt-4 text-center font-medium text-red-400";
            return;
        }
        
        // El user y ownerId deberían estar garantizados aquí, pero se revalida.
        if (!ownerId) {
             feedbackMessage.textContent = "❌ Error crítico: ID de usuario no disponible. Intenta refrescar la página.";
             feedbackMessage.className = "mt-4 text-center font-medium text-red-400";
             return;
        }

        // Deshabilitar botón para evitar envíos múltiples
        submitButton.disabled = true;
        submitButton.textContent = "Creando...";
        feedbackMessage.textContent = "⏳ Iniciando creación del servidor...";
        feedbackMessage.className = "mt-4 text-center font-medium text-yellow-400";

        try {
            // 1. CREAR EL SERVIDOR
            const { data: serverData, error: serverError } = await supabase
                .from("servers")
                .insert([
                    { 
                        name: serverName, 
                        owner_id: ownerId 
                    }
                ])
                .select()
                .single(); 

            if (serverError) throw serverError;

            const newServerId = serverData.server_id;

            // 2. CREAR EL CANAL INICIAL ASOCIADO AL SERVIDOR
            feedbackMessage.textContent = "⏳ Servidor creado. Creando canal inicial...";

            const { error: channelError } = await supabase
                .from("channels")
                .insert([
                    { 
                        name: channelName, 
                        channel_type: channelType,
                        server_id: newServerId // Clave foránea al nuevo servidor
                    }
                ]);

            if (channelError) {
                console.error("Error al crear el canal:", channelError);
                feedbackMessage.textContent = "⚠️ Servidor creado, pero falló la creación del canal inicial. " + channelError.message;
                feedbackMessage.className = "mt-4 text-center font-medium text-orange-400";
                return; 
            }

            // 3. ÉXITO
            feedbackMessage.textContent = `🎉 Servidor '${serverName}' y canal '#${channelName}' creados exitosamente!`;
            feedbackMessage.className = "mt-4 text-center font-medium text-green-400";

            // Redirigir al chat para que el usuario pueda ver su nuevo servidor
            setTimeout(() => {
                window.location.hash = '#actividades'; 
                window.dispatchEvent(new Event('hashchange')); 
            }, 2000); 

        } catch (error) {
            console.error("Error al procesar la creación:", error);
            // Mostrar un mensaje de error más específico para el usuario
            let userMessage = "Error desconocido.";
            if (error.message) {
                 userMessage = error.message;
            }

            feedbackMessage.textContent = "❌ Error al crear el servidor: " + userMessage;
            feedbackMessage.className = "mt-4 text-center font-medium text-red-400";
        } finally {
            // Restablecer botón
            submitButton.disabled = false;
            submitButton.textContent = "🚀 Crear Servidor y Canal";
        }
    });
}