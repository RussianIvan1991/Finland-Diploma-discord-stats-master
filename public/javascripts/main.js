jQuery(function () {
    const socket = io();

    socket.on('statsEnd', function (stats) {
        let statsBlock = $('.dashboard__stats');
        statsBlock.find(`.dashboard__stats_channel[data-channel=${stats.channelID}]`).remove();

        let wordList = '';
        for (let id in stats.words) {
            let word = stats.words[id];
            wordList += `<span style="display: block">${word.word} - ${word.num}</span>`
        }

        let emojiList = '';
        for (let id in stats.emoji) {
            let emoji = stats.emoji[id];
            emojiList += `<span style="display: block">${emoji.emoji} - ${emoji.num}</span>`
        }

        let channelInputID = $('#channel-selector input[name=channelID]').val();
        let style = 'display: none';
        if (channelInputID === stats.channelID) {
            style = '';
        }

        let statsChannelBlock =
            `<div class="dashboard__stats_channel" data-channel="${stats.channelID}" style="${style}">
                <div>
                    ${wordList}
                </div>
                <div>
                    ${emojiList}
                </div>
            </div>`;

        statsBlock.append(statsChannelBlock);
    });

    $('#start-stats').on('click', function (e) {
        e.preventDefault();

        let channelInput = $('#channel-selector input[name=channelID]');
        let channelID = channelInput.val();
        let data = $('#channel-selector').serialize();
        $.post({
            url: '/stats',
            data: data,
            dataType: 'json',
            success: data => {
                if (data.result) {
                    let statsBlock = $('.dashboard__stats');
                    statsBlock.find(`.dashboard__stats_channel[data-channel=${channelID}]`).remove();
                    let style = 'display: none';
                    if (channelInput.val() === channelID) {
                        style = '';
                    }
                    let statsChannelBlock =
                        `<div class="dashboard__stats_channel" data-channel="${channelID}" style="${style}">
                            <span>Reading messages...</span>
                        </div>`;
                    statsBlock.append(statsChannelBlock);
                }
            }
        });
    });

    $('#channel-selector select[name=guildID]').on('change', function () {
        $('#channel-selector select[data-guild]').each(function () {
            $(this).removeClass('active');
            $(this).addClass('disabled');
            $(this).val($(this).children('option:first').val());
        });

        $('.dashboard__stats_channel').each(function () {
            $(this).hide();
        });

        let guildID = $(this).val();
        let channelInput = $('#channel-selector input[name=channelID]');
        let channelSelector = $(`#channel-selector select[data-guild=${guildID}]`);
        channelInput.val('');

        channelSelector.addClass('active');
        channelSelector.removeClass('disabled');
    });

    $('#channel-selector select[data-guild]').on('change', function () {
        if (!$(this).hasClass('active')) return;

        $('.dashboard__stats_channel').each(function () {
            $(this).hide();
        });

        let channelInput = $('#channel-selector input[name=channelID]');
        let channelID = $(this).val();
        let channelStats = $(`.dashboard__stats_channel[data-channel=${channelID}]`);

        if (channelStats) {
            channelStats.show();
        }

        channelInput.val($(this).val());
    });
});
