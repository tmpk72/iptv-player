document.addEventListener('DOMContentLoaded', () => {
    const channelList = document.getElementById('channel-list');
    const videoPlayer = document.getElementById('video-player');
    let hls = null;

    // **เปลี่ยนมาใช้ CORS Proxy สำหรับทุกช่อง**
    const PROXY_URL = 'https://api.allorigins.win/raw?url='; // Proxy ที่เสถียร
    // หรือลองใช้ Proxy ตัวอื่นเป็นทางเลือก ถ้า AllOrigins ไม่ทำงาน
    // const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; // (ต้องขออนุญาตก่อนใช้ครั้งแรก)

    const playChannel = (url) => {
        // ทำลาย hls instance เก่าก่อน
        if (hls) {
            hls.destroy();
        }
        
        // **ส่วนสำคัญ: ทำให้ URL ทั้งหมดถูก Proxy**
        // เราจะไม่ใช้เงื่อนไข if/else อีกต่อไป แต่จะใช้ Proxy กับทุก URL 
        // ยกเว้นว่า URL นั้นเป็น HTTPS อยู่แล้ว (ซึ่งอาจรองรับ CORS เอง)
        let finalUrl = url;
        if (url.startsWith('http://') || url.includes('112.27.235.94')) {
             finalUrl = PROXY_URL + encodeURIComponent(url);
        }

        // ตรวจสอบว่าเบราว์เซอร์รองรับ HLS.js หรือไม่
        if (Hls.isSupported()) {
            hls = new Hls({
                p2p: false, 
                lowLatencyMode: true,
                
                // ตั้งค่า xhrSetup เพื่อให้ Segment ถูก Proxy ด้วย (สำคัญมากสำหรับ CCTV6 IP)
                xhrSetup: function(xhr, xhrUrl) {
                    if (xhrUrl.startsWith('http://') || xhrUrl.includes('112.27.235.94')) {
                        // ถ้าเป็น http หรือลิงก์ IP เดิม ให้ Proxy ทุกการร้องขอ (รวมถึง Segment .ts)
                        xhr.open('GET', PROXY_URL + encodeURIComponent(xhrUrl), true);
                    }
                }
            });
            
            hls.loadSource(finalUrl); 
            
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play();
            });
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data.details, data.fatal);
                if (data.fatal) {
                    // แสดงข้อผิดพลาดให้ชัดเจน
                    console.error('Fatal HLS Error:', data.details);
                }
            });

        } 
        // สำหรับ Safari หรือเบราว์เซอร์ที่รองรับ M3U8 โดยตรง
        else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.addEventListener('loadedmetadata', () => {
                videoPlayer.play();
            });
        }
    };

    const loadChannels = async () => {
        try {
            const response = await fetch('channels.json');
            const channels = await response.json();

            // สร้างปุ่มสำหรับแต่ละช่อง (ส่วนนี้ถูกต้องอยู่แล้ว)
            channels.forEach(channel => {
                const button = document.createElement('button');
                button.classList.add('channel-button');
                button.textContent = channel.name;
                
                button.addEventListener('click', () => {
                    document.querySelectorAll('.channel-button').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    playChannel(channel.url);
                });
                channelList.appendChild(button);
            });

            if (channels.length > 0) {
                document.querySelector('.channel-button').click();
            }

        } catch (error) {
            console.error('Error loading channels:', error);
            channelList.innerHTML = '<p>ไม่สามารถโหลดรายการช่องได้ โปรดตรวจสอบไฟล์ channels.json</p>';
        }
    };

    loadChannels();
});
