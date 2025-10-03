document.addEventListener('DOMContentLoaded', () => {
    const channelList = document.getElementById('channel-list');
    const videoPlayer = document.getElementById('video-player');
    let hls = null;

    // URL ของ CORS Proxy ที่คาดว่าจะเสถียร (AllOrigins)
    const PROXY_URL = 'https://api.allorigins.win/raw?url=';
    
    const playChannel = (url) => {
        // ทำลาย hls instance เก่าก่อน
        if (hls) {
            hls.destroy();
        }
        
        // กำหนด URL ที่จะใช้โหลด: 
        // 1. ถ้าเป็นลิงก์ CCTV6 ให้ใช้ Proxy แบบกำหนดเอง (เพื่อให้โหลด Segment ได้ด้วย)
        // 2. ถ้าเป็นลิงก์อื่น ๆ ให้ใช้ Proxy แบบตรง ๆ เลย
        let initialUrl = url;
        let useProxyForSegments = false;

        if (url.includes('112.27.235.94')) {
            useProxyForSegments = true;
        } else {
            // สำหรับช่องอื่นๆ ให้ลองใช้ Proxy เป็นค่าเริ่มต้นเลย เพื่อแก้ปัญหา CORS ทั่วไป
            initialUrl = PROXY_URL + encodeURIComponent(url);
        }

        // ตรวจสอบว่าเบราว์เซอร์รองรับ HLS.js หรือไม่
        if (Hls.isSupported()) {
            hls = new Hls({
                // การตั้งค่าทั่วไปเพื่อเพิ่มความเสถียร
                p2p: false, 
                lowLatencyMode: true,
                
                // **ส่วนที่สำคัญ:** ตั้งค่าให้ดึง Manifest และ Segment ผ่าน Proxy 
                // เฉพาะกรณีที่เป็นช่อง CCTV6 (ที่เราต้องใช้ลิงก์ VLC IP)
                xhrSetup: function(xhr, xhrUrl) {
                    if (useProxyForSegments) {
                        // ถ้าเป็นช่อง CCTV6 ให้ Proxy ทั้งไฟล์ Manifest (.m3u8) และ Segment (.ts)
                        xhr.open('GET', PROXY_URL + encodeURIComponent(xhrUrl), true);
                    }
                }
            });
            
            // ให้โหลด Source ตาม URL ที่กำหนด (อาจเป็น Proxy แล้ว หรือยังไม่เป็น Proxy ก็ได้)
            hls.loadSource(useProxyForSegments ? (PROXY_URL + encodeURIComponent(url)) : initialUrl); 
            
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play();
            });
            
            // เพิ่มการตรวจสอบข้อผิดพลาด (สำคัญมาก)
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data.details, data.fatal);
                if (data.fatal) {
                    // แจ้งผู้ใช้ถึงข้อผิดพลาดร้ายแรง
                    channelList.innerHTML = `<p style="color:red;">ไม่สามารถเล่นช่องนี้ได้: ${data.details}. ลองเลือกช่องอื่น</p>`;
                    // ลองโหลดช่องอื่นเป็นทางเลือก
                    // document.querySelector('.channel-button:not(.active)')?.click(); 
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
