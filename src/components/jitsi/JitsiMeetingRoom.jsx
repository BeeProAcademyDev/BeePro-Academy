import { useMemo } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { getJitsiConfigurationIssue, getJitsiDomain } from '../../lib/jitsi'
import './JitsiMeetingRoom.css'

const JitsiMeetingRoom = ({
  roomName,
  displayName = 'Guest',
  isModerator = false,
  onClose,
  language = 'ar'
}) => {
  const domain = getJitsiDomain()
  const configurationIssue = getJitsiConfigurationIssue()

  const configOverwrite = useMemo(() => ({
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    disableModeratorIndicator: false,
    enableWelcomePage: false,
    prejoinPageEnabled: false,
    hideConferenceSubject: false,
    disableChat: false,
    enableLobbyChat: true
  }), [])

  const interfaceConfigOverwrite = useMemo(() => ({
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    MOBILE_APP_PROMO: false,
    LANG_DETECTION: true,
    DEFAULT_LANGUAGE: language === 'ar' ? 'ar' : 'en',
    TOOLBAR_BUTTONS: [
      'microphone',
      'camera',
      'chat',
      'raisehand',
      'tileview',
      'participants-pane',
      'hangup'
    ]
  }), [language])

  if (!roomName || configurationIssue) {
    return (
      <div className="jitsi-room jitsi-room--error">
        <p>
          {configurationIssue
            ? (language === 'ar'
                ? 'Jitsi غير مضبوط للمنصة. استخدم دومين Jitsi خاص أو JaaS بدلاً من meet.jit.si حتى لا تظهر شاشة تسجيل Google.'
                : configurationIssue)
            : (language === 'ar' ? 'غرفة الاجتماع غير متاحة' : 'Meeting room is not available')}
        </p>
      </div>
    )
  }

  return (
    <div className="jitsi-room">
      {onClose && (
        <button type="button" className="jitsi-room__close" onClick={onClose}>
          {language === 'ar' ? 'إغلاق الجلسة' : 'Close session'}
        </button>
      )}
      <div className="jitsi-room__frame">
        <JitsiMeeting
          domain={domain}
          roomName={roomName}
          configOverwrite={configOverwrite}
          interfaceConfigOverwrite={interfaceConfigOverwrite}
          userInfo={{
            displayName,
            email: ''
          }}
          getIFrameRef={(iframeRef) => {
            if (iframeRef) {
              iframeRef.style.height = '100%'
              iframeRef.style.width = '100%'
              iframeRef.style.border = '0'
            }
          }}
        />
      </div>
    </div>
  )
}

export default JitsiMeetingRoom
