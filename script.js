document.addEventListener('DOMContentLoaded', () => {
    const channelList = document.getElementById('channel-list');
    const videoPlayer = document.getElementById('video-player');
    let hls = null;

    const playChannel = (url) => {
        // ทำลาย hls instance เก่าก่อน
        if (hls) {
            hls.destroy();
        }
        
        // **URL ของ CORS Proxy ที่คาดว่าจะเสถียร (AllOrigins)**
        const PROXY_URL = 'https://api.allorigins.win/raw?url=';
        
        // ตรวจสอบว่าเบราว์เซอร์รองรับ HLS.js หรือไม่
        if (Hls.isSupported()) {
            hls = new Hls({
                // **ส่วนที่สำคัญ:** ตั้งค่าให้ดึง Manifest ผ่าน Proxy
                xhrSetup: function(xhr, url) {
                    // หาก URL ที่ดึงมาเป็น URL ต้นฉบับที่เราต้องการเล่น (M3U8)
                    // (ตรวจสอบจากส่วนหนึ่งของลิงก์ VLC ของคุณเพื่อไม่ให้กระทบช่องอื่น)
                    if (url.includes('112.27.235.94')) { 
                        xhr.open('GET', PROXY_URL + encodeURIComponent(url), true);
                    }
                },
                p2p: false, 
                lowLatencyMode: true 
            });
            
            // ให้โหลด M3U8 ผ่าน Proxy
            const finalUrl = PROXY_URL + encodeURIComponent(url);
            hls.loadSource(finalUrl); 
            
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play();
            });
            
            // เพิ่มการตรวจสอบข้อผิดพลาดเพื่อดูว่าเกิดอะไรขึ้น
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data.details, data.fatal);
                if (data.fatal) {
                    // หากเกิดข้อผิดพลาดร้ายแรง ให้ลองโหลดใหม่ (อาจไม่ช่วย แต่เป็นแนวทางแก้ปัญหา)
                    // playChannel(url); 
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
        
        // ตรวจสอบว่าเบราว์เซอร์รองรับ HLS.js หรือไม่ (สำหรับไฟล์ .m3u8)
        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play();
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
            // ดึงข้อมูลรายการช่องจาก channels.json
            const response = await fetch('channels.json');
            const channels = await response.json();

            // สร้างปุ่มสำหรับแต่ละช่อง
            channels.forEach(channel => {
                const button = document.createElement('button');
                button.classList.add('channel-button');
                button.textContent = channel.name;
                
                // กำหนด Event เมื่อคลิกปุ่ม
                button.addEventListener('click', () => {
                    // ลบสถานะ active จากปุ่มทั้งหมด
                    document.querySelectorAll('.channel-button').forEach(btn => btn.classList.remove('active'));
                    // กำหนดสถานะ active ให้ปุ่มที่เพิ่งถูกคลิก
                    button.classList.add('active');
                    // เล่นช่องตาม URL
                    playChannel(channel.url);
                });
                channelList.appendChild(button);
            });

            // เล่นช่องแรกทันทีเมื่อโหลดเสร็จ
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

