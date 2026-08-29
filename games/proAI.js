// ===== proAI.js —— 五子棋「职业AI」第一版 =====
// 用途：给 games/gomoku.html 的电脑执子用——简单评分式 AI（先只做一步搜索）。
// 逻辑总览：proAIMove() 是入口 → proSearch() 逐格打分 → evaluatePoint() 评估某点价值。
// ⚠️ 当前板子 board[i][j]：0=空，1=玩家(白)，2=AI(黑)。15x15 棋盘。

// 职业AI入口：算一步棋并下
function proAIMove(){

    let move = proSearch();      // 让 AI 搜索最佳落点

    if(move){

        play(move[0],move[1]);   // 调用主程序的 play() 落子（行/列）

    }

}


// 搜索最佳位置：遍历 15x15 每个空位，打「进攻分+防守分」，取最高分那格
function proSearch(){

    let bestMove=null;
    let bestScore=-999999;       // 最高分初始给个极小值（保证任何有效分数都能替换）


    for(let i=0;i<15;i++){       // 行遍历

        for(let j=0;j<15;j++){   // 列遍历

            if(board[i][j]==0){  // 只算空位


                let score=0;


                // 模拟AI落子（临时放上去，打分完再撤）
                board[i][j]=2;


                // 进攻评分：这个点对 AI 自己（黑子）值多少
                score += evaluatePoint(i,j,2);


                // 恢复（还原成空位）
                board[i][j]=0;



                // 模拟玩家落子
                board[i][j]=1;


                // 防守评分：这个点对玩家（白子）潜力多大 → 乘 1.2 让防守略优先
                score += evaluatePoint(i,j,1)*1.2;


                board[i][j]=0;   // 还原



                if(score>bestScore){   // 刷新最高分

                    bestScore=score;

                    bestMove=[i,j];    // 记录最佳落点

                }

            }

        }

    }


    return bestMove;             // 返回 [行,列]，没空位时返回 null

}

// ===== 职业AI第二阶段：未来搜索（Minimax 雏形） =====
// 用途：递归模拟未来 depth 步棋；当前尚未被主程序接入使用（预留扩展）。

function proMinimax(depth,ai){

    if(depth==0){                // 搜到底了：直接返回整个盘面的静态估值

        return evaluateBoard();

    }


    let best = ai ? -999999 : 999999;   // AI 想最大化、玩家想最小化


    for(let i=0;i<15;i++){

        for(let j=0;j<15;j++){


            if(board[i][j]==0){


                board[i][j]=ai?2:1;     // 当前轮到谁就放谁的子


                let score=proMinimax(depth-1,!ai);   // 递归下一层（换手）


                board[i][j]=0;          // 还原（回溯）



                if(ai){

                    if(score>best){     // AI 层取最大

                        best=score;

                    }

                }
                else{

                    if(score<best){     // 玩家层取最小（Minimax 的 Min 部分）

                        best=score;

                    }

                }

            }


        }

    }


    return best;

}
