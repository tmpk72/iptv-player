document.addEventListener('DOMContentLoaded', () => {
    const channelList = document.getElementById('channel-list');
    const videoPlayer = document.getElementById('video-player');
    let hls = null;

    // ฟังก์ชันสำหรับเล่นช่องที่เลือก
    const playChannel = (url) => {
        if (hls) {
            hls.destroy(); // หยุดช่องที่เล่นอยู่
        }
        
        if (Hls.isSupported()) {
            // ใช้ Hls.js สำหรับเบราว์เซอร์ที่รองรับ
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play();
            });
             hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    console.error("HLS Fatal Error:", data);
                    channelList.innerHTML = '<p style="color:red;">พบข้อผิดพลาด: ลิงก์สตรีมอาจเสียหรือไม่ถูกต้อง</p>';
                }
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // สำรองสำหรับ Safari (iOS/macOS)
            videoPlayer.src = url;
            videoPlayer.addEventListener('loadedmetadata', () => {
                videoPlayer.play();
            });
        } else {
            console.error('HLS is not supported on this browser.');
        }
    };

    // ฟังก์ชันสำหรับโหลดรายการช่องจาก channels.json
    const loadChannels = async () => {
        try {
            const response = await fetch('channels.json');
            const channels = await response.json();

            channelList.innerHTML = ''; // เคลียร์ข้อความ "กำลังโหลด"

            channels.forEach((channel, index) => {
                const button = document.createElement('button');
                button.classList.add('channel-button');
                button.textContent = channel.name;
                
                button.addEventListener('click', () => {
                    // ลบ active class จากปุ่มทั้งหมด
                    document.querySelectorAll('.channel-button').forEach(btn => btn.classList.remove('active'));
                    // เพิ่ม active class ให้ปุ่มที่คลิก
                    button.classList.add('active');
                    playChannel(channel.url);
                });
                channelList.appendChild(button);
                
                // เล่นช่องแรกทันทีเมื่อโหลดเสร็จ
                if (index === 0) {
                    button.classList.add('active');
                    playChannel(channel.url);
                }
            });

        } catch (error) {
            console.error('Error loading channels:', error);
            channelList.innerHTML = '<p style="color:red;">ไม่สามารถโหลดรายการช่องได้ โปรดตรวจสอบไฟล์ channels.json</p>';
        }
    };

    loadChannels();
});