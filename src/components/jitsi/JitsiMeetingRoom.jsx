import { useMemo } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { getJitsiConfigurationIssue, getJitsiDomain } from '../../lib/jitsi'
import './JitsiMeetingRoom.css'
import { useTranslation } from 'react-i18next'

const JitsiMeetingRoom = ({
  roomName,
  displayName = 'Guest',
  isModerator = false,
  onClose,
  language = 'ar'
}) => {
  const { t } = useTranslation()
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
    DEFAULT_LANGUAGE: t('jitsiMeetingRoom.en'),
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
            ? configurationIssue
            : t('jitsiMeetingRoom.meetingRoomIsNotAvailable')}
        </p>
      </div>
    )
  }

  return (
    <div className="jitsi-room">
      {onClose && (
        <button type="button" className="jitsi-room__close" onClick={onClose}>
          {t('jitsiMeetingRoom.closeSession')}
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
